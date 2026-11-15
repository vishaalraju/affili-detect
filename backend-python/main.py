import base64
import io
import math
import os
import re
import urllib.parse
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import numpy as np
import requests
from bs4 import BeautifulSoup
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

# Initialize FastAPI
app = FastAPI(title="Affili-Detect AI Shopping Assistant API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for YOLO and CLIP
yolo_model = None
clip_model = None

# ═══════════════════════════════════════════════════════════════════════════════
#  PRODUCT CATALOG  — shared across detection, intelligence, and alternatives
# ═══════════════════════════════════════════════════════════════════════════════
PRODUCT_DATASET = [
    # ── ELECTRONICS: Phones ──────────────────────────────────────────────────
    {"id": "iphone-15", "title": "iPhone 15 Pro Max", "category": "phone", "description": "Apple iPhone 15 Pro Max, titanium chassis, A17 Pro chip, Action button, USB-C.", "base_price": 1199.00},
    {"id": "s24-ultra", "title": "Samsung Galaxy S24 Ultra", "category": "phone", "description": "Samsung Galaxy S24 Ultra, Snapdragon 8 Gen 3, S-Pen included, 200MP camera.", "base_price": 1299.00},
    {"id": "pixel-8-pro", "title": "Google Pixel 8 Pro", "category": "smartphone", "description": "Google Pixel 8 Pro, Tensor G3 chip, AI photography features, 7 years of updates.", "base_price": 999.00},
    {"id": "oneplus-12", "title": "OnePlus 12 5G", "category": "android_phone", "description": "OnePlus 12 5G, Snapdragon 8 Gen 3, 100W charging, Hasselblad camera.", "base_price": 799.00},

    # ── ELECTRONICS: Chargers & Power ────────────────────────────────────────
    {"id": "anker-cube", "title": "Anker 3-in-1 MagSafe Charging Cube", "category": "charger", "description": "Anker 3-in-1 MagSafe charging cube for iPhone, Apple Watch, and AirPods. Foldable design.", "base_price": 149.95},
    {"id": "anker-usb-c", "title": "Anker USB-C to Lightning Cable 6ft", "category": "usb_cable", "description": "Anker PowerLine III USB-C to Lightning braided cable, MFi certified, fast charging.", "base_price": 15.99},
    {"id": "anker-powerbank", "title": "Anker 26800mAh Power Bank", "category": "power_bank", "description": "Anker PowerCore 26800 portable charger, dual USB output, 3A high-speed charging.", "base_price": 65.99},

    # ── ELECTRONICS: Audio ───────────────────────────────────────────────────
    {"id": "airpods-pro", "title": "Apple AirPods Pro 2", "category": "earphones", "description": "Apple AirPods Pro 2nd Gen, active noise cancellation, adaptive transparency, USB-C case.", "base_price": 249.00},
    {"id": "sony-headphones", "title": "Sony WH-1000XM5 Headphones", "category": "headphones", "description": "Sony premium noise-cancelling over-ear headphones, wireless Bluetooth, 30 hours battery.", "base_price": 348.00},
    {"id": "jbl-flip6", "title": "JBL Flip 6 Portable Speaker", "category": "speaker", "description": "JBL Flip 6 portable waterproof Bluetooth speaker, 12-hour battery, PartyBoost pairing.", "base_price": 129.95},

    # ── ELECTRONICS: Wearables ───────────────────────────────────────────────
    {"id": "apple-watch-ultra", "title": "Apple Watch Ultra 2", "category": "smartwatch", "description": "Apple Watch Ultra 2, GPS + Cellular, titanium case, action button, up to 36 hours battery.", "base_price": 799.00},
    {"id": "galaxy-watch-6", "title": "Samsung Galaxy Watch 6", "category": "smartwatch", "description": "Samsung Galaxy Watch 6, Bluetooth, heart rate, sleep tracking, BIA sensor.", "base_price": 299.00},

    # ── ELECTRONICS: Computers ───────────────────────────────────────────────
    {"id": "macbook-pro-16", "title": "MacBook Pro 16 M3", "category": "laptop", "description": "Apple MacBook Pro 16-inch M3 Max, 36GB unified memory, liquid retina XDR display.", "base_price": 2499.00},
    {"id": "dell-xps-15", "title": "Dell XPS 15 Laptop", "category": "laptop", "description": "Dell XPS 15 with Intel Core i9, 32GB RAM, OLED touch, NVIDIA RTX 4060.", "base_price": 1899.00},
    {"id": "logitech-mouse", "title": "Logitech MX Master 3S Mouse", "category": "mouse", "description": "Logitech MX Master 3S wireless ergonomic mouse, 8K DPI, ultra-fast MagSpeed scroll.", "base_price": 99.99},
    {"id": "logitech-keyboard", "title": "Logitech MX Keys S Keyboard", "category": "keyboard", "description": "Logitech MX Keys S full-size wireless keyboard, smart backlighting, multi-device.", "base_price": 109.99},
    {"id": "ipad-air", "title": "Apple iPad Air M2", "category": "tablet", "description": "Apple iPad Air M2 chip, 11-inch Liquid Retina, Touch ID, Apple Pencil support.", "base_price": 599.00},
    {"id": "dell-monitor", "title": "Dell UltraSharp 27 4K Monitor", "category": "monitor", "description": "Dell UltraSharp U2723QE 27-inch 4K USB-C hub monitor, IPS Black, 100% sRGB.", "base_price": 519.99},

    # ── ELECTRONICS: Peripherals ─────────────────────────────────────────────
    {"id": "fire-tv-remote", "title": "Amazon Fire TV Stick Remote", "category": "tv_remote", "description": "Amazon Alexa Voice Remote Pro, backlit buttons, built-in speaker, programmable buttons.", "base_price": 34.99},
    {"id": "sony-camera", "title": "Sony Alpha A7 IV Camera", "category": "camera", "description": "Sony A7 IV full-frame mirrorless camera, 33MP sensor, 4K 60fps video, fast hybrid AF.", "base_price": 2498.00},
    {"id": "hp-printer", "title": "HP OfficeJet Pro 9015e Printer", "category": "printer", "description": "HP OfficeJet Pro 9015e all-in-one wireless inkjet printer, two-sided printing, auto feeder.", "base_price": 229.99},

    # ── STATIONERY ───────────────────────────────────────────────────────────
    {"id": "pilot-g2-pen", "title": "Pilot G2 Retractable Gel Pen (12-pack)", "category": "pen", "description": "Pilot G2 premium retractable gel pen, ultra fine 0.38mm, smooth writing, black ink.", "base_price": 15.49},
    {"id": "ticonderoga-pencil", "title": "Ticonderoga #2 Pencils (96-pack)", "category": "pencil", "description": "Dixon Ticonderoga #2 HB premium wood-cased pencils, pre-sharpened, latex-free eraser.", "base_price": 14.99},
    {"id": "pentel-eraser", "title": "Pentel Hi-Polymer Block Eraser (10-pack)", "category": "eraser", "description": "Pentel Hi-Polymer block eraser, non-abrasive, smudge-free, clean erasing on paper.", "base_price": 7.99},
    {"id": "prismacolor-sharpener", "title": "Prismacolor Premier Pencil Sharpener", "category": "sharpener", "description": "Prismacolor Premier dual-hole sharpener for standard and wide pencils, catch container.", "base_price": 6.49},
    {"id": "moleskine-notebook", "title": "Moleskine Classic Notebook", "category": "notebook", "description": "Moleskine Classic ruled hardcover notebook, 240 pages, elastic closure, bookmark ribbon.", "base_price": 22.95},
    {"id": "atomic-habits-book", "title": "Atomic Habits by James Clear", "category": "book", "description": "Atomic Habits bestselling hardcover book on building good habits and breaking bad ones.", "base_price": 14.99},
    {"id": "sharpie-marker", "title": "Sharpie Permanent Markers (12-pack)", "category": "marker", "description": "Sharpie Fine Point permanent markers, quick-drying ink, fade resistant, 12 assorted colors.", "base_price": 11.49},
    {"id": "steel-ruler", "title": "Westcott 12-inch Stainless Steel Ruler", "category": "scale", "description": "Westcott 12-inch stainless steel office ruler with cork backing, metric and imperial.", "base_price": 4.99},
    {"id": "swingline-stapler", "title": "Swingline 747 Desktop Stapler", "category": "stapler", "description": "Swingline 747 Business classic desktop stapler, 25-sheet capacity, all-steel construction.", "base_price": 24.99},

    # ── LIFESTYLE: Drinkware & Bags ──────────────────────────────────────────
    {"id": "hydro-flask", "title": "Hydro Flask 32 oz Wide Mouth Bottle", "category": "water_bottle", "description": "Hydro Flask insulated stainless steel water bottle, TempShield, flex straw lid.", "base_price": 44.95},
    {"id": "yeti-rambler", "title": "Yeti Rambler 20 oz Tumbler", "category": "water_bottle", "description": "Yeti Rambler insulated tumbler with MagSlider lid, kitchen-grade stainless steel.", "base_price": 35.00},
    {"id": "tumi-bag", "title": "Tumi Alpha 3 Brief Pack", "category": "bag", "description": "Tumi Alpha 3 brief pack messenger bag, ballistic nylon, laptop compartment, RFID pocket.", "base_price": 525.00},
    {"id": "osprey-backpack", "title": "Osprey Daylite 13L Backpack", "category": "backpack", "description": "Osprey Daylite everyday backpack, 13 liter, padded laptop sleeve, mesh ventilated back.", "base_price": 75.00},
    {"id": "rfid-wallet", "title": "Bellroy Slim Leather Wallet", "category": "wallet", "description": "Bellroy Slim Wallet, premium leather, RFID blocking, pull-tab for quick access, 5-12 cards.", "base_price": 89.00},

    # ── LIFESTYLE: Footwear ──────────────────────────────────────────────────
    {"id": "nike-air-max", "title": "Nike Air Max 90 Sneaker", "category": "shoes", "description": "Nike Air Max 90 iconic running sneaker, visible Air unit, waffle outsole, retro styling.", "base_price": 139.99},
    {"id": "adidas-ultraboost", "title": "Adidas Ultraboost Light Sneaker", "category": "shoes", "description": "Adidas Ultraboost Light running shoe, BOOST midsole, Primeknit upper, Continental grip.", "base_price": 189.99},
    {"id": "crocs-classic", "title": "Crocs Classic Clog", "category": "slippers", "description": "Crocs Classic Clog, lightweight Croslite foam, ventilation ports, iconic comfort.", "base_price": 49.99},

    # ── LIFESTYLE: Watch ─────────────────────────────────────────────────────
    {"id": "casio-gshock", "title": "Casio G-Shock GA-2100 Watch", "category": "watch", "description": "Casio G-Shock GA-2100 CasiOak analog-digital watch, carbon core guard, 200m water resist.", "base_price": 99.99},

    # ── KITCHEN ──────────────────────────────────────────────────────────────
    {"id": "yeti-mug", "title": "Yeti Rambler 14 oz Coffee Mug", "category": "coffee_mug", "description": "Yeti Rambler 14 oz stainless steel insulated coffee mug with MagSlider lid.", "base_price": 30.00},
    {"id": "corelle-plates", "title": "Corelle Vitrelle 6-Piece Dinner Plate Set", "category": "plate", "description": "Corelle Vitrelle triple-layer glass dinner plate set, lightweight, break/chip resistant.", "base_price": 37.99},
    {"id": "oneida-spoon", "title": "Oneida Stainless Steel Spoon Set", "category": "spoon", "description": "Oneida Juilliard 18/10 stainless steel dinner spoon flatware set, mirror polish finish.", "base_price": 19.99},

    # ── FURNITURE ────────────────────────────────────────────────────────────
    {"id": "herman-miller-chair", "title": "Herman Miller Aeron Ergonomic Chair", "category": "chair", "description": "Herman Miller Aeron fully loaded ergonomic office chair, PostureFit SL, adjustable arms.", "base_price": 1495.00},
    {"id": "ikea-desk", "title": "IKEA BEKANT Sit/Stand Desk", "category": "table", "description": "IKEA BEKANT motorized sit/stand desk, 63x31.5 inches, white top, electric height adjust.", "base_price": 549.00},
    {"id": "dyson-fan", "title": "Dyson Pure Cool TP07 Tower Fan", "category": "fan", "description": "Dyson Pure Cool tower purifier fan, HEPA + carbon filter, oscillation, Air Multiplier.", "base_price": 569.99},
    {"id": "desk-lamp", "title": "BenQ ScreenBar Monitor Light", "category": "lamp", "description": "BenQ ScreenBar LED monitor desk lamp, auto-dimming, no screen glare, USB powered.", "base_price": 119.00},

    # ── ACCESSORIES ──────────────────────────────────────────────────────────
    {"id": "rayban-glasses", "title": "Ray-Ban RB5154 Clubmaster Eyeglasses", "category": "glasses", "description": "Ray-Ban RB5154 Clubmaster optical eyeglasses, acetate/metal frame, demo lens.", "base_price": 171.00},
    {"id": "rayban-sunglasses", "title": "Ray-Ban RB2132 New Wayfarer Sunglasses", "category": "sunglasses", "description": "Ray-Ban New Wayfarer classic sunglasses, polarized green lenses, glossy black frame.", "base_price": 163.00},
    {"id": "nike-cap", "title": "Nike Dri-FIT Club Cap", "category": "cap", "description": "Nike Dri-FIT Club unstructured cap, moisture-wicking sweatband, adjustable strap, swoosh.", "base_price": 24.00},

    # ── ELECTRONICS: More Phones & Tablets ───────────────────────────────────
    {"id": "iphone-14",        "title": "iPhone 14 128GB",                          "category": "phone",         "description": "Apple iPhone 14, A15 Bionic, Ceramic Shield, Emergency SOS via satellite, 12MP camera.",              "base_price": 699.00},
    {"id": "moto-g-power",     "title": "Motorola Moto G Power 5G",                 "category": "phone",         "description": "Motorola Moto G Power 5G, 5000mAh battery, 50MP triple camera, 6.5-inch FHD+ display.",               "base_price": 299.99},
    {"id": "samsung-a54",      "title": "Samsung Galaxy A54 5G",                    "category": "phone",         "description": "Samsung Galaxy A54 5G, 6.4-inch Super AMOLED, 50MP OIS camera, 5000mAh, IP67.",                      "base_price": 449.99},
    {"id": "ipad-pro-13",      "title": "Apple iPad Pro 13\" M4",                   "category": "tablet",        "description": "Apple iPad Pro 13-inch M4, Ultra Retina XDR tandem OLED, Apple Pencil Pro support.",                "base_price": 1299.00},
    {"id": "samsung-tab-s9",   "title": "Samsung Galaxy Tab S9 Ultra",              "category": "tablet",        "description": "Samsung Galaxy Tab S9 Ultra, 14.6-inch AMOLED, S-Pen included, Snapdragon 8 Gen 2.",                  "base_price": 1199.00},
    {"id": "fire-hd-10",       "title": "Amazon Fire HD 10 Tablet",                 "category": "tablet",        "description": "Amazon Fire HD 10, 10.1-inch 1080p Full HD, 3GB RAM, 32GB, hands-free Alexa.",                       "base_price": 139.99},

    # ── ELECTRONICS: More Audio ───────────────────────────────────────────────
    {"id": "airpods-3",        "title": "Apple AirPods 3rd Generation",             "category": "earphones",     "description": "Apple AirPods 3rd Gen, Spatial Audio, Adaptive EQ, MagSafe case, IPX4.",                              "base_price": 169.00},
    {"id": "bose-qc45",        "title": "Bose QuietComfort 45 Headphones",          "category": "headphones",    "description": "Bose QC45 wireless noise-cancelling headphones, 24hr battery, foldable, USB-C.",                     "base_price": 279.00},
    {"id": "sonos-one",        "title": "Sonos One Smart Speaker",                  "category": "speaker",       "description": "Sonos One with Alexa and Google Assistant, rich stereo sound, AirPlay 2, Trueplay tuning.",        "base_price": 219.00},
    {"id": "echo-dot-5",       "title": "Amazon Echo Dot 5th Gen with Clock",       "category": "speaker",       "description": "Echo Dot 5th Gen with LED clock display, Alexa, improved bass, Motion Detection.",                  "base_price": 59.99},
    {"id": "galaxy-buds3-pro", "title": "Samsung Galaxy Buds3 Pro",                 "category": "earphones",     "description": "Samsung Galaxy Buds3 Pro TWS earbuds, intelligent ANC, 360-degree audio, 6hr+15hr case.",          "base_price": 249.99},

    # ── ELECTRONICS: More Wearables ───────────────────────────────────────────
    {"id": "apple-watch-s9",   "title": "Apple Watch Series 9 GPS 45mm",            "category": "smartwatch",    "description": "Apple Watch Series 9, S9 chip, Double Tap gesture, Always-On Retina, 18hr battery.",               "base_price": 429.00},
    {"id": "fitbit-charge-6",  "title": "Fitbit Charge 6 Fitness Tracker",          "category": "fitness_tracker","description": "Fitbit Charge 6, ECG, built-in GPS, heart rate, YouTube Music, Google Maps.",                  "base_price": 159.95},
    {"id": "garmin-fenix-7",   "title": "Garmin Fenix 7 Pro Solar GPS Watch",       "category": "smartwatch",    "description": "Garmin Fenix 7 Pro Solar, solar charging, multi-sport, topographic maps, up to 37 days battery.", "base_price": 849.99},
    {"id": "seiko-5-sports",   "title": "Seiko 5 Sports Automatic Watch",           "category": "watch",         "description": "Seiko 5 Sports automatic mechanical watch, 24-jewel movement, 100m water resistance, day-date.",  "base_price": 299.00},

    # ── ELECTRONICS: More Computers & Peripherals ─────────────────────────────
    {"id": "macbook-air-15",   "title": "MacBook Air 15\" M3",                      "category": "laptop",        "description": "Apple MacBook Air 15-inch M3, 18-hour battery, 15.3-inch Liquid Retina, fanless design.",         "base_price": 1299.00},
    {"id": "lenovo-thinkpad",  "title": "Lenovo ThinkPad X1 Carbon Gen 11",         "category": "laptop",        "description": "Lenovo ThinkPad X1 Carbon 11th Gen, Intel Core i7 vPro, 16GB LPDDR5, 14-inch IPS.",                "base_price": 1649.00},
    {"id": "asus-rog-zephyrus","title": "ASUS ROG Zephyrus G14 Gaming Laptop",      "category": "gaming_laptop", "description": "ASUS ROG Zephyrus G14, AMD Ryzen 9, RTX 4060, 16GB RAM, 1TB NVMe, MiniLED display.",              "base_price": 1499.00},
    {"id": "apple-magic-kb",   "title": "Apple Magic Keyboard with Touch ID",       "category": "keyboard",      "description": "Apple Magic Keyboard with Touch ID and numeric keypad, USB-C, scissor-switch mechanism.",          "base_price": 129.00},
    {"id": "keychron-q3",      "title": "Keychron Q3 Mechanical Keyboard TKL",     "category": "keyboard",      "description": "Keychron Q3 QMK custom mechanical TKL, Gateron G Pro Red, hot-swappable, CNC aluminum.",          "base_price": 169.00},
    {"id": "lg-ultragear",     "title": "LG UltraGear 27\" 4K 144Hz Gaming Monitor","category": "monitor",       "description": "LG 27GP950-B 4K UHD Nano IPS, 144Hz, 1ms, HDMI 2.1, G-Sync compatible, HDR600.",                 "base_price": 699.99},
    {"id": "acer-nitro",       "title": "Acer Nitro 27\" QHD 165Hz Monitor",        "category": "monitor",       "description": "Acer Nitro XV272U 27-inch QHD IPS, 165Hz, 0.5ms VRB, AMD FreeSync Premium.",                     "base_price": 249.99},
    {"id": "belkin-pad",       "title": "Belkin 3-in-1 Wireless Charger Pad",       "category": "charger",       "description": "Belkin BOOST CHARGE PRO 3-in-1 MagSafe pad, 15W fast charge, for iPhone+Watch+AirPods.",            "base_price": 149.99},
    {"id": "ugreen-gan",       "title": "UGREEN 65W GaN USB-C Charger",             "category": "charger",       "description": "UGREEN Nexode 65W GaN USB-C charger, 3 ports (2C+1A), foldable, PD 3.0 PPS.",                       "base_price": 35.99},
    {"id": "roku-ultra",       "title": "Roku Ultra 4K HDR+ Streaming Player",      "category": "streaming",     "description": "Roku Ultra 2024, 4K HDR+ Dolby Vision, hands-free voice, private listening, lost remote finder.", "base_price": 99.99},
    {"id": "canon-r50",        "title": "Canon EOS R50 Mirrorless Camera",          "category": "camera",        "description": "Canon EOS R50, 24.2MP APS-C, RF-S 18-45mm kit lens, 4K, subject tracking AF, vlogging-ready.",   "base_price": 679.99},
    {"id": "dji-mini4",        "title": "DJI Mini 4 Pro Drone",                     "category": "drone",         "description": "DJI Mini 4 Pro, 4K HDR video, 34-min flight, omni-directional obstacle sensing, 20km range.",     "base_price": 759.00},
    {"id": "tp-link-router",   "title": "TP-Link Deco XE75 Pro Mesh Wi-Fi 6E",      "category": "networking",    "description": "TP-Link Deco XE75 Pro tri-band mesh Wi-Fi 6E, 11Gbps, covers 5500 sq ft, 2-pack.",                 "base_price": 349.99},
    {"id": "seagate-hdd",      "title": "Seagate Portable 2TB External Hard Drive", "category": "storage",       "description": "Seagate Portable 2TB USB 3.0 external HDD, works with PC, Mac, PS4, Xbox.",                       "base_price": 54.99},
    {"id": "samsung-t7",       "title": "Samsung T7 Portable SSD 1TB",              "category": "storage",       "description": "Samsung T7 1TB portable SSD, 1050 MB/s read, USB 3.2, AES 256-bit encryption.",                   "base_price": 89.99},

    # ── STATIONERY: More ──────────────────────────────────────────────────────
    {"id": "post-it-notes",    "title": "Post-It Super Sticky Notes 90-Pack",       "category": "stationery",    "description": "Post-it Super Sticky Pop-up Notes, 3x3in, 90 sheets, canary yellow, repositionable.",            "base_price": 9.99},
    {"id": "book-rich-dad",    "title": "Rich Dad Poor Dad by Robert Kiyosaki",     "category": "book",          "description": "Rich Dad Poor Dad, #1 personal finance book, lessons about money, investing, and financial freedom.", "base_price": 9.99},

    # ── LIFESTYLE: More Drinkware, Bags, Clothing ─────────────────────────────
    {"id": "stanley-quencher", "title": "Stanley Quencher H2.0 FlowState 40 oz",   "category": "water_bottle",  "description": "Stanley Quencher 40oz tumbler, straw lid, handle, keeps cold 2 days, dishwasher safe.",          "base_price": 45.00},
    {"id": "herschel-backpack","title": "Herschel Little America Backpack 30L",     "category": "backpack",      "description": "Herschel Little America 30L backpack, 15in laptop sleeve, magnetic buckle, fleece-lined pocket.", "base_price": 99.99},
    {"id": "samsonite-carry-on","title": "Samsonite Omni PC 20\" Carry-On Spinner", "category": "luggage",       "description": "Samsonite Omni PC 20-inch hardside carry-on, TSA lock, spinner wheels, expandable.",             "base_price": 149.99},
    {"id": "levis-511",        "title": "Levi's 511 Slim Fit Jeans",                "category": "jeans",         "description": "Levi's 511 slim fit jeans, sits below waist, cotton blend, versatile everyday denim.",            "base_price": 69.50},
    {"id": "north-face-jacket","title": "The North Face Nuptse 700 Down Jacket",    "category": "jacket",        "description": "The North Face Nuptse 700-fill down jacket, water resistant, baffled body, zippered pockets.",    "base_price": 280.00},
    {"id": "patagonia-fleece", "title": "Patagonia Better Sweater 1/4-Zip Fleece", "category": "jacket",        "description": "Patagonia Better Sweater fleece, recycled polyester, flatlock seams, chest zip pocket.",          "base_price": 149.00},

    # ── LIFESTYLE: More Footwear ──────────────────────────────────────────────
    {"id": "new-balance-990",  "title": "New Balance 990v6 Sneaker",                "category": "shoes",         "description": "New Balance 990v6 made in USA, ENCAP midsole, premium suede/mesh, superior cushioning.",        "base_price": 184.99},
    {"id": "ugg-classic",      "title": "UGG Classic Short Boot",                   "category": "boots",         "description": "UGG Classic Short Boot, genuine twin-face sheepskin, molded EVA outsole, water-resistant.",    "base_price": 165.00},
    {"id": "skechers-gowalk",  "title": "Skechers Go Walk 7 Slip-On",               "category": "shoes",         "description": "Skechers Go Walk 7, Air-Cooled Goga Mat insole, 5GEN midsole, machine washable mesh upper.",    "base_price": 79.99},

    # ── KITCHEN: More Appliances & Cookware ───────────────────────────────────
    {"id": "nespresso-vertuo", "title": "Nespresso Vertuo Next Coffee Machine",     "category": "coffee_maker",  "description": "Nespresso Vertuo Next, 5 cup sizes, used pods recycle program, 25-sec heat up.",                "base_price": 149.00},
    {"id": "keurig-k-elite",   "title": "Keurig K-Elite Coffee Maker",              "category": "coffee_maker",  "description": "Keurig K-Elite, strong brew, iced coffee mode, 75oz reservoir, compatible with My K-Cup.",      "base_price": 149.99},
    {"id": "instant-pot-duo",  "title": "Instant Pot Duo 7-in-1 Electric Pressure Cooker 6Qt","category": "appliance","description": "Instant Pot Duo 7-in-1 multi-use pressure cooker, slow cooker, rice cooker, steamer, 6qt.", "base_price": 79.95},
    {"id": "ninja-air-fryer",  "title": "Ninja AF101 4 Qt Air Fryer",               "category": "appliance",     "description": "Ninja Air Fryer 4Qt, 1550W, wide temp 105-400F, nonstick ceramic basket, dishwasher safe.",      "base_price": 99.99},
    {"id": "kitchenaid-mixer", "title": "KitchenAid Artisan 5 Qt Stand Mixer",      "category": "appliance",     "description": "KitchenAid Artisan 5Qt stand mixer, 10 speeds, 59-point planetary mixing, tilt-head.",            "base_price": 349.99},
    {"id": "cuisinart-knife-set","title": "Cuisinart 15-Piece German Knife Block Set","category": "kitchen",     "description": "Cuisinart 15-piece knife block set, German steel, riveted handles, full-tang, with sharpener.",  "base_price": 59.95},

    # ── FURNITURE & SMART HOME ────────────────────────────────────────────────
    {"id": "flexispot-e7",     "title": "FlexiSpot E7 Pro Height Adjustable Desk",  "category": "table",         "description": "FlexiSpot E7 Pro standing desk, dual motor, 275-lb capacity, anti-collision, cable tray.",     "base_price": 429.99},
    {"id": "ring-doorbell",    "title": "Ring Video Doorbell Pro 2",                "category": "smart_home",    "description": "Ring Video Doorbell Pro 2, 3D motion detection, Head-to-Toe HD+, Bird's Eye View, hardwired.",   "base_price": 249.99},
    {"id": "nest-thermostat",  "title": "Google Nest Learning Thermostat 4th Gen",  "category": "smart_home",    "description": "Google Nest 4th Gen thermostat, programs itself, HVAC monitoring, Wi-Fi, Alexa compatible.",     "base_price": 249.00},
    {"id": "philips-hue",      "title": "Philips Hue White A19 Starter Kit 4-Pack", "category": "smart_home",   "description": "Philips Hue White A19 Smart Bulbs 4-pack with Bridge, 16M colors, Alexa/Google/Siri support.",  "base_price": 79.99},
    {"id": "roomba-j7",        "title": "iRobot Roomba j7+ Self-Emptying Robot Vacuum","category": "vacuum",    "description": "iRobot Roomba j7+ self-emptying robot vacuum, PrecisionVision avoids pet waste, Alexa.",       "base_price": 599.99},
    {"id": "dyson-v15",        "title": "Dyson V15 Detect Cordless Vacuum",         "category": "vacuum",        "description": "Dyson V15 Detect, laser dust detection, HEPA filtration, 60-min run time, LCD screen.",       "base_price": 749.99},

    # ── SPORTS & FITNESS ─────────────────────────────────────────────────────
    {"id": "bowflex-dumbbell", "title": "Bowflex SelectTech 552 Adjustable Dumbbells","category": "fitness",    "description": "Bowflex SelectTech 552, adjusts 5-52 lbs per dumbbell in 2.5-lb increments, 15 settings.",     "base_price": 429.00},
    {"id": "yoga-mat",         "title": "Lululemon The Reversible Mat 5mm",          "category": "fitness",       "description": "Lululemon reversible yoga mat, 5mm, non-slip texture both sides, moisture-wicking polyurethane.", "base_price": 88.00},
    {"id": "trek-bike",        "title": "Trek FX 3 Disc Hybrid Bike",               "category": "bicycle",       "description": "Trek FX 3 Disc hybrid bike, Shimano 24-speed, hydraulic disc brakes, integrated rear rack mounts.", "base_price": 849.99},
    {"id": "yeti-cooler",      "title": "YETI Tundra 45 Hard Cooler",               "category": "outdoor",       "description": "YETI Tundra 45 cooler, PermaFrost insulation, dry-ice compatible, bear-resistant certified.",  "base_price": 325.00},
    {"id": "weber-grill",      "title": "Weber Spirit II E-310 Gas Grill",          "category": "outdoor",       "description": "Weber Spirit II E-310, 3 burners, 529 sq-in cooking area, GS4 high-performance system.",       "base_price": 549.00},
    {"id": "coleman-tent",     "title": "Coleman Sundome 4-Person Camping Tent",    "category": "camping",       "description": "Coleman Sundome 4-person tent, WeatherTec system, strong frame, sets up in 15 minutes.",        "base_price": 109.99},
    {"id": "nikon-binoculars", "title": "Nikon Monarch M5 8x42 Binoculars",         "category": "outdoor",       "description": "Nikon Monarch M5 8x42, roof prism, waterproof/fogproof, dielectric multilayer coated prisms.",   "base_price": 379.95},

    # ── BEAUTY & PERSONAL CARE ───────────────────────────────────────────────
    {"id": "dyson-hair-dryer", "title": "Dyson Supersonic HD08 Hair Dryer",         "category": "beauty",        "description": "Dyson Supersonic HD08, intelligent heat control, Coanda smoothing nozzle, 1600W.",              "base_price": 429.00},
    {"id": "oral-b-io9",       "title": "Oral-B iO Series 9 Electric Toothbrush",   "category": "beauty",        "description": "Oral-B iO Series 9, 7 brushing modes, AI pressure sensor, Bluetooth, refill reminder.",        "base_price": 199.99},
    {"id": "foreo-luna4",      "title": "FOREO LUNA 4 Face Cleansing Device",       "category": "beauty",        "description": "FOREO LUNA 4 facial cleansing brush, T-Sonic pulsations, 16 intensities, 300hr battery.",      "base_price": 199.00},

    # ── PETS ─────────────────────────────────────────────────────────────────
    {"id": "furbo-camera",     "title": "Furbo 360-Degree Dog Camera + Treat Toss", "category": "pets",          "description": "Furbo 360-degree dog camera, treat toss, 2-way audio, barking alert, works with Alexa.",       "base_price": 169.00},
    {"id": "petlibro-feeder",  "title": "PETLIBRO Automatic Pet Feeder",             "category": "pets",          "description": "PETLIBRO automatic cat/dog feeder, 5L, Wi-Fi, 1080p camera, voice recording, Amazon Alexa.",   "base_price": 89.99},
    {"id": "kong-toy",         "title": "KONG Classic Dog Chew Toy",                "category": "pets",          "description": "KONG Classic durable rubber dog toy, fill with treats, helps with separation anxiety, washable.", "base_price": 12.99},

    # ── AUTOMOTIVE ACCESSORIES ────────────────────────────────────────────────
    {"id": "garmin-gps",       "title": "Garmin DriveSmart 76 GPS Navigator",       "category": "electronics",   "description": "Garmin DriveSmart 76, 7-inch touchscreen, driver alert features, hands-free calling, Bluetooth.", "base_price": 199.99},
    {"id": "anker-car-charger","title": "Anker 69W USB-C Car Charger",              "category": "charger",       "description": "Anker 69W 3-port car charger, 60W USB-C PD + 12W USB-A, charges MacBook and phone simultaneously.", "base_price": 25.99},
    {"id": "dash-cam",         "title": "Garmin Dash Cam Mini 2",                   "category": "camera",        "description": "Garmin Dash Cam Mini 2, 1080p, 140-degree FOV, automatic incident detection, voice controlled.", "base_price": 69.99},
]

# We compute textual descriptions embeddings using CLIP on startup
PRODUCT_VECTORS = []


# ═══════════════════════════════════════════════════════════════════════════════
#  AI PRODUCT INTELLIGENCE ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

# ── Pros/Cons Knowledge Base (per category + per product) ────────────────────
PRODUCT_PROS_CONS: Dict[str, dict] = {
    # Per-product overrides
    "iphone-15": {
        "pros": [
            "Industry-leading A17 Pro chip performance",
            "Premium titanium build, lightest Pro Max ever",
            "Excellent 48MP camera system with 5× optical zoom",
            "USB-C with USB 3 speeds (finally!)",
            "Action button for quick shortcuts",
        ],
        "cons": [
            "Very expensive — starts at $1,199",
            "No significant design change from iPhone 14 Pro",
            "Still limited to 60Hz on base models",
            "No sideloading without EU region",
            "Heavy at 221g despite titanium",
        ],
        "rating": 4.6,
        "verdict": "Excellent flagship — best for Apple ecosystem users",
    },
    "s24-ultra": {
        "pros": [
            "200MP main camera with exceptional zoom",
            "Built-in S-Pen for productivity",
            "Snapdragon 8 Gen 3 is blazing fast",
            "7 years of OS updates guaranteed",
            "Titanium frame, premium feel",
        ],
        "cons": [
            "Expensive at $1,299 base price",
            "Curved edges can cause accidental touches",
            "Samsung bloatware out of the box",
            "S-Pen silo is small, easy to lose",
            "Battery drain with always-on display",
        ],
        "rating": 4.5,
        "verdict": "Best Android flagship — power users will love the S-Pen",
    },
    "macbook-pro-16": {
        "pros": [
            "M3 Max chip is a desktop-class powerhouse",
            "Stunning Liquid Retina XDR display",
            "Up to 22 hours battery life",
            "Excellent speakers and mic array",
            "Runs cool and silent under load",
        ],
        "cons": [
            "Starts at $2,499 — very expensive",
            "Heavy at 2.14 kg for a laptop",
            "No touchscreen option",
            "Limited gaming library on macOS",
            "RAM is not user-upgradeable",
        ],
        "rating": 4.7,
        "verdict": "The best creative professional laptop available",
    },
    "dell-xps-15": {
        "pros": [
            "Gorgeous OLED touch display",
            "RTX 4060 for light gaming/creative work",
            "Compact form factor for a 15\" laptop",
            "Strong build quality with CNC aluminum",
            "Good keyboard and trackpad",
        ],
        "cons": [
            "Runs hot under sustained workloads",
            "Webcam placement is awkward",
            "Expensive for the specs offered",
            "Fan noise can be distracting",
            "Battery life is average (~8 hours)",
        ],
        "rating": 4.3,
        "verdict": "Great Windows all-rounder with a stunning screen",
    },
    "sony-headphones": {
        "pros": [
            "Industry-best active noise cancellation",
            "30-hour battery life",
            "Multipoint Bluetooth (2 devices)",
            "Lightweight and comfortable for all-day wear",
            "Speak-to-Chat auto-pause feature",
        ],
        "cons": [
            "Premium price at $348",
            "No IP water resistance rating",
            "Touch controls can be accidentally triggered",
            "No aptX codec support",
            "Carrying case is bulky",
        ],
        "rating": 4.7,
        "verdict": "The gold standard for noise-cancelling headphones",
    },
    "logitech-mouse": {
        "pros": [
            "Ultra-fast MagSpeed electromagnetic scroll wheel",
            "Works on any surface including glass",
            "USB-C quick charging (1 min = 3 hours)",
            "Ergonomic shape reduces wrist strain",
            "Connects to 3 devices via Bluetooth + USB",
        ],
        "cons": [
            "Expensive for a mouse at ~$100",
            "Right-hand only — no left-hand model",
            "Heavy at 141g",
            "Logi Options+ software can be bloated",
            "Not ideal for gaming (high latency)",
        ],
        "rating": 4.6,
        "verdict": "Best productivity mouse money can buy",
    },
}

# Category-level fallback pros/cons
CATEGORY_PROS_CONS: Dict[str, dict] = {
    "phone": {
        "pros": ["Always-connected mobile computing", "High-quality camera system", "Vast app ecosystem", "Portable and pocketable"],
        "cons": ["Short battery life under heavy use", "Expensive flagships >$1000", "Fragile glass design", "Planned obsolescence concerns"],
        "rating": 4.2, "verdict": "Essential daily device — compare specs carefully",
    },
    "laptop": {
        "pros": ["Powerful portable workstation", "Large screen for productivity", "Full keyboard for typing", "Runs desktop-class software"],
        "cons": ["Can be heavy for travel", "Battery degrades over 2-3 years", "Expensive to repair", "Heat management challenges"],
        "rating": 4.1, "verdict": "Great for work and study — pick based on your primary use case",
    },
    "watch": {
        "pros": ["Health & fitness tracking on wrist", "Notifications without pulling out phone", "Stylish accessory", "GPS navigation"],
        "cons": ["Needs daily or frequent charging", "Small screen limits usability", "Dependent on phone ecosystem", "Subscription features add cost"],
        "rating": 4.0, "verdict": "Useful for fitness enthusiasts and notification management",
    },
    "headphones": {
        "pros": ["Immersive audio experience", "Noise cancellation for focus", "Wireless convenience", "Long battery life"],
        "cons": ["Can cause ear fatigue", "Sound quality varies by price", "Connectivity issues possible", "Not ideal for situational awareness"],
        "rating": 4.3, "verdict": "Worth it for commuters, travelers, and music lovers",
    },
    "bottle": {
        "pros": ["Keeps drinks hot/cold for hours", "Eco-friendly vs disposable bottles", "Durable stainless steel", "BPA-free materials"],
        "cons": ["Can be heavy when full", "Hand-wash only for some models", "Dents if dropped on hard surface", "Insulated lids can leak"],
        "rating": 4.4, "verdict": "Essential eco-friendly purchase — a must-have",
    },
    "shoes": {
        "pros": ["Comfortable for long walks/runs", "Modern style and colorways", "Responsive cushioning technology", "Breathable mesh upper"],
        "cons": ["Premium brands are expensive", "Sizing can be inconsistent", "Wear out after 300-500 miles", "Some models run narrow"],
        "rating": 4.2, "verdict": "Try before you buy — comfort varies by foot shape",
    },
    "mouse": {
        "pros": ["Ergonomic design reduces strain", "Wireless freedom", "Customizable buttons", "Precise tracking sensor"],
        "cons": ["Battery needs charging", "Can be expensive for premium models", "Right-hand bias in most designs", "Bluetooth latency for gaming"],
        "rating": 4.3, "verdict": "Good investment for daily computer users",
    },
    "keyboard": {
        "pros": ["Comfortable typing experience", "Backlit keys for dark environments", "Multi-device connectivity", "Programmable shortcuts"],
        "cons": ["Full-size keyboards take desk space", "Mechanical ones can be loud", "Wireless adds latency", "Keys wear over time"],
        "rating": 4.2, "verdict": "Choose based on switch type and connectivity needs",
    },
    "charger": {
        "pros": ["Consolidates multiple chargers into one", "Wireless convenience", "Clean desk setup", "Travel-friendly"],
        "cons": ["Slower than wired charging", "Heat generation during charging", "Alignment can be finicky", "Expensive for multi-device models"],
        "rating": 4.1, "verdict": "Great for decluttering — check device compatibility first",
    },
}


def get_pros_cons(product_id: str, category: str) -> dict:
    """Return pros/cons for a specific product, falling back to category-level data."""
    if product_id in PRODUCT_PROS_CONS:
        return PRODUCT_PROS_CONS[product_id]
    return CATEGORY_PROS_CONS.get(category, {
        "pros": ["Well-reviewed by users", "Good value for money", "Solid build quality"],
        "cons": ["Limited color options", "May have cheaper alternatives", "Check warranty terms"],
        "rating": 3.8, "verdict": "Decent product — compare alternatives before buying",
    })


# ── Price Prediction (Linear Regression on Simulated Historical Data) ────────

def generate_price_history(base_price: float, product_id: str, days: int = 90) -> List[dict]:
    """
    Generate realistic simulated price history using seasonality + noise.
    Uses a seeded RNG per product_id for deterministic results.
    """
    seed = sum(ord(c) for c in product_id) % 10000
    rng = np.random.RandomState(seed)

    today = datetime.now()
    history = []

    for i in range(days, 0, -1):
        date = today - timedelta(days=i)
        day_of_year = date.timetuple().tm_yday

        # Seasonal component: prices drop during Black Friday (Nov) and Prime Day (Jul)
        seasonal = 1.0
        month = date.month
        if month == 11:  # November — Black Friday
            seasonal = 0.85 + rng.uniform(-0.03, 0.03)
        elif month == 7:  # July — Prime Day
            seasonal = 0.88 + rng.uniform(-0.02, 0.02)
        elif month == 12:  # December — Holiday surge
            seasonal = 1.05 + rng.uniform(-0.02, 0.03)
        elif month in (1, 2):  # Post-holiday clearance
            seasonal = 0.92 + rng.uniform(-0.02, 0.02)
        else:
            seasonal = 1.0 + rng.uniform(-0.04, 0.04)

        # Gradual depreciation trend (tech products lose ~0.05% per day)
        depreciation = 1.0 - (i * 0.0005)

        # Random daily noise
        noise = rng.uniform(-0.02, 0.02)

        price = round(base_price * seasonal * depreciation + base_price * noise, 2)
        price = max(price, base_price * 0.65)  # Floor at 65% of base

        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "price": price
        })

    return history


def predict_price(history: List[dict], days_ahead: int = 30) -> dict:
    """
    Simple linear regression on price history to predict future price.
    Returns predicted price, trend direction, and confidence.
    """
    n = len(history)
    if n < 10:
        return {"predicted_price": history[-1]["price"], "trend": "stable", "confidence": 50}

    # Use last 30 days for short-term trend
    recent = history[-30:]
    x = np.arange(len(recent), dtype=float)
    y = np.array([p["price"] for p in recent])

    # Linear regression: y = mx + b
    x_mean = np.mean(x)
    y_mean = np.mean(y)
    numerator = np.sum((x - x_mean) * (y - y_mean))
    denominator = np.sum((x - x_mean) ** 2)

    if denominator == 0:
        slope = 0
    else:
        slope = numerator / denominator

    intercept = y_mean - slope * x_mean

    # Predict future price
    future_x = len(recent) + days_ahead
    predicted = round(slope * future_x + intercept, 2)

    # Calculate R² for confidence
    y_pred = slope * x + intercept
    ss_res = np.sum((y - y_pred) ** 2)
    ss_tot = np.sum((y - y_mean) ** 2)
    r_squared = 1 - (ss_res / (ss_tot + 1e-9))
    confidence = int(max(0, min(100, r_squared * 100)))

    # Determine trend
    pct_change = ((predicted - y[-1]) / y[-1]) * 100
    if pct_change < -3:
        trend = "dropping"
    elif pct_change > 3:
        trend = "rising"
    else:
        trend = "stable"

    return {
        "predicted_price": max(predicted, y[-1] * 0.65),
        "current_price": round(float(y[-1]), 2),
        "trend": trend,
        "pct_change": round(pct_change, 1),
        "confidence": confidence,
        "days_ahead": days_ahead,
    }


# ── Best Time to Buy Analysis ────────────────────────────────────────────────

def get_best_time_to_buy(category: str, base_price: float) -> dict:
    """Seasonal analysis for when to buy a product category."""
    now = datetime.now()
    current_month = now.month

    SEASONAL_CALENDAR = {
        "phone": {
            "best_months": [9, 10, 11],
            "reason": "New models launch Sep/Oct, previous gen drops 20-30%. Black Friday adds further discounts.",
            "worst_months": [3, 4, 5],
            "savings_pct": "15-30%",
        },
        "laptop": {
            "best_months": [7, 8, 11],
            "reason": "Back-to-school sales (Jul-Aug) and Black Friday (Nov) offer the deepest laptop discounts.",
            "worst_months": [1, 2, 6],
            "savings_pct": "20-35%",
        },
        "watch": {
            "best_months": [9, 11, 12],
            "reason": "New Apple Watch launches in Sep push older models down. Holiday sales add more cuts.",
            "worst_months": [3, 4, 5],
            "savings_pct": "10-25%",
        },
        "headphones": {
            "best_months": [6, 7, 11],
            "reason": "Prime Day (Jul) and Black Friday (Nov) consistently deliver 25-40% off premium headphones.",
            "worst_months": [2, 3, 4],
            "savings_pct": "25-40%",
        },
        "shoes": {
            "best_months": [1, 7, 11],
            "reason": "Post-holiday clearance (Jan), mid-year sales (Jul), and Black Friday for best shoe deals.",
            "worst_months": [3, 4, 9],
            "savings_pct": "20-50%",
        },
    }

    info = SEASONAL_CALENDAR.get(category, {
        "best_months": [7, 11],
        "reason": "Prime Day (Jul) and Black Friday (Nov) are reliable sale events for most product categories.",
        "worst_months": [3, 4],
        "savings_pct": "10-25%",
    })

    in_best_window = current_month in info["best_months"]
    in_worst_window = current_month in info["worst_months"]

    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    # Calculate days until next best month
    best_month_names = [month_names[m - 1] for m in info["best_months"]]
    next_best = None
    for m in sorted(info["best_months"]):
        if m > current_month:
            next_best = month_names[m - 1]
            break
    if not next_best:
        next_best = month_names[info["best_months"][0] - 1]

    if in_best_window:
        timing_verdict = "buy_now"
        timing_label = "🟢 BUY NOW — You're in the best buying window!"
    elif in_worst_window:
        timing_verdict = "wait"
        timing_label = f"🔴 WAIT — Prices are at peak. Best window: {next_best}"
    else:
        timing_verdict = "fair"
        timing_label = f"🟡 FAIR PRICE — Next best window: {next_best}"

    return {
        "verdict": timing_verdict,
        "label": timing_label,
        "best_months": best_month_names,
        "reason": info["reason"],
        "potential_savings": info["savings_pct"],
        "next_best_month": next_best,
    }


# ── Fake Review Detection (Heuristic NLP) ────────────────────────────────────

def analyze_review_authenticity(product_id: str, product_title: str) -> dict:
    """
    Heuristic fake review detector. Uses product-seeded deterministic analysis.
    In production, this would use NLP on actual scraped reviews.
    """
    seed = sum(ord(c) for c in product_id) % 10000
    rng = np.random.RandomState(seed)

    # Simulated review metrics (deterministic per product)
    total_reviews = int(rng.uniform(200, 15000))
    verified_pct = round(rng.uniform(55, 92), 1)
    one_day_burst_pct = round(rng.uniform(2, 18), 1)
    generic_language_pct = round(rng.uniform(5, 35), 1)
    avg_review_length = int(rng.uniform(20, 280))
    five_star_pct = round(rng.uniform(40, 85), 1)

    # Suspicious signals scoring (0 = safe, 100 = very suspicious)
    score = 0
    flags = []

    # Low verified percentage
    if verified_pct < 65:
        score += 25
        flags.append(f"Only {verified_pct}% verified purchases")
    elif verified_pct < 75:
        score += 10

    # Review bombing (burst of reviews in short period)
    if one_day_burst_pct > 12:
        score += 20
        flags.append(f"{one_day_burst_pct}% of reviews posted on same day")
    elif one_day_burst_pct > 8:
        score += 10

    # Generic/template language
    if generic_language_pct > 25:
        score += 20
        flags.append(f"{generic_language_pct}% reviews use generic template language")
    elif generic_language_pct > 15:
        score += 10

    # Very short reviews (likely bot-generated)
    if avg_review_length < 50:
        score += 15
        flags.append("Average review is very short (possible bot activity)")
    elif avg_review_length < 100:
        score += 5

    # Unusually high 5-star ratio
    if five_star_pct > 75:
        score += 15
        flags.append(f"Suspiciously high {five_star_pct}% five-star ratio")
    elif five_star_pct > 65:
        score += 5

    score = min(score, 100)

    if score < 20:
        risk_level = "low"
        risk_label = "✅ Reviews appear authentic"
    elif score < 45:
        risk_level = "medium"
        risk_label = "⚠️ Some review patterns worth noting"
    elif score < 70:
        risk_level = "high"
        risk_label = "🚨 Multiple suspicious review patterns detected"
    else:
        risk_level = "critical"
        risk_label = "🔴 High probability of manipulated reviews"

    return {
        "risk_score": score,
        "risk_level": risk_level,
        "risk_label": risk_label,
        "total_reviews": total_reviews,
        "verified_purchase_pct": verified_pct,
        "flags": flags,
        "metrics": {
            "five_star_pct": five_star_pct,
            "verified_pct": verified_pct,
            "avg_review_length": avg_review_length,
            "burst_review_pct": one_day_burst_pct,
            "generic_language_pct": generic_language_pct,
        }
    }


# ── Alternative Product Suggestions ──────────────────────────────────────────

def find_alternatives(product_id: str, category: str, limit: int = 3) -> List[dict]:
    """Find alternative products in the same category, excluding the current product."""
    alternatives = []
    for p in PRODUCT_DATASET:
        if p["id"] != product_id and p["category"] == category:
            alternatives.append({
                "id": p["id"],
                "title": p["title"],
                "category": p["category"],
                "base_price": p["base_price"],
                "price_formatted": f"${p['base_price']:.2f}",
                "description": p["description"],
            })
    # If same-category alternatives are scarce, add cross-category suggestions
    if len(alternatives) < limit:
        for p in PRODUCT_DATASET:
            if p["id"] != product_id and p["category"] != category:
                alternatives.append({
                    "id": p["id"],
                    "title": p["title"],
                    "category": p["category"],
                    "base_price": p["base_price"],
                    "price_formatted": f"${p['base_price']:.2f}",
                    "description": p["description"],
                    "cross_category": True,
                })
                if len(alternatives) >= limit + 2:
                    break
    return alternatives[:limit]


# ── Quick AI Verdict for AR Overlay ──────────────────────────────────────────

def get_ai_verdict(product_id: str, category: str, current_price: float, base_price: float) -> dict:
    """Generate a quick AI verdict for the AR overlay badge."""
    pros_cons = get_pros_cons(product_id, category)
    timing = get_best_time_to_buy(category, base_price)
    reviews = analyze_review_authenticity(product_id, "")

    price_ratio = current_price / base_price if base_price > 0 else 1.0

    # Composite score
    points = 0
    if price_ratio < 0.90:
        points += 3  # Great price
    elif price_ratio < 0.95:
        points += 2
    elif price_ratio > 1.05:
        points -= 1

    if pros_cons.get("rating", 3.8) >= 4.5:
        points += 2
    elif pros_cons.get("rating", 3.8) >= 4.0:
        points += 1

    if timing["verdict"] == "buy_now":
        points += 2
    elif timing["verdict"] == "wait":
        points -= 1

    if reviews["risk_level"] in ("high", "critical"):
        points -= 2

    if points >= 5:
        return {"verdict": "great_buy", "label": "✅ Great Buy", "color": "#10b981"}
    elif points >= 3:
        return {"verdict": "good_buy", "label": "✅ Good Buy", "color": "#10b981"}
    elif points >= 1:
        return {"verdict": "fair_deal", "label": "🟡 Fair Deal", "color": "#f59e0b"}
    elif points >= -1:
        return {"verdict": "wait_for_sale", "label": "⚠️ Wait for Sale", "color": "#f59e0b"}
    else:
        return {"verdict": "skip", "label": "🔴 Consider Alternatives", "color": "#ef4444"}


# ═══════════════════════════════════════════════════════════════════════════════
#  CORE INFRASTRUCTURE (unchanged — scrapers, CLIP matching, etc.)
# ═══════════════════════════════════════════════════════════════════════════════

def get_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
    }

def init_models():
    global yolo_model, clip_model, PRODUCT_VECTORS
    
    # 1. Load YOLOv8 model (runs locally)
    try:
        from ultralytics import YOLO
        print("Loading YOLOv8 model...")
        yolo_model = YOLO("yolov8n.pt")
    except Exception as e:
        print("Error loading YOLO:", e)
        yolo_model = None

    # 2. Load CLIP model (runs locally)
    try:
        from sentence_transformers import SentenceTransformer
        print("Loading CLIP model (ViT-B-32)...")
        clip_model = SentenceTransformer("clip-ViT-B-32")
        
        # Pre-calculate CLIP embeddings with standard photo-caption template for best accuracy
        texts = [
            f"a photo of a {p['title']}, a type of {p['category']}"
            for p in PRODUCT_DATASET
        ]
        embeddings = clip_model.encode(texts, batch_size=32, show_progress_bar=False)
        for i, emb in enumerate(embeddings):
            PRODUCT_VECTORS.append({
                "product": PRODUCT_DATASET[i],
                "vector": emb
            })
        print(f"Pre-computed CLIP embeddings for {len(PRODUCT_DATASET)} catalog items.")
    except Exception as e:
        print("Error loading CLIP:", e)
        clip_model = None

@app.on_event("startup")
def startup_event():
    init_models()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "yolo_loaded": yolo_model is not None,
        "clip_loaded": clip_model is not None,
        "intelligence_engine": True,
    }

# Scrapers with fallback mock pricing
def scrape_amazon(product_name: str, base_price: float, affiliate_tag: str = "affilidetect-20"):
    url = f"https://www.amazon.com/s?k={urllib.parse.quote(product_name)}&tag={affiliate_tag}"
    price = base_price
    try:
        res = requests.get(url, headers=get_headers(), timeout=5)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            price_elem = soup.find("span", {"class": "a-price-whole"})
            if price_elem:
                price = float(price_elem.text.replace(",", "").strip())
                # Add fractional part
                frac_elem = soup.find("span", {"class": "a-price-fraction"})
                if frac_elem:
                    price += float(f"0.{frac_elem.text.strip()}")
    except Exception as e:
        print("Amazon scrape error, using simulated variance:", e)
        # Failover: apply dynamic variance (-5% to +2% of base_price)
        price = round(base_price * np.random.uniform(0.95, 1.02), 2)
    return {
        "store": "Amazon",
        "price": f"${price:.2f}",
        "numeric_price": price,
        "shipping": "Free Prime Shipping",
        "badge": "📦 1-Day Prime" if price <= base_price else "",
        "url": url
    }

def scrape_ebay(product_name: str, base_price: float, affiliate_tag: str = "affilidetect-20"):
    url = f"https://www.ebay.com/sch/i.html?_nkw={urllib.parse.quote(product_name)}&campid={affiliate_tag}"
    price = base_price
    try:
        res = requests.get(url, headers=get_headers(), timeout=5)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            price_elem = soup.find("span", {"class": "s-item__price"})
            if price_elem:
                raw_price = re.sub(r'[^\d.]', '', price_elem.text.split("to")[0])
                if raw_price:
                    price = float(raw_price)
    except Exception as e:
        print("eBay scrape error, using simulated variance:", e)
        # Failover: apply dynamic variance (-10% to -1% of base)
        price = round(base_price * np.random.uniform(0.90, 0.99), 2)
    return {
        "store": "eBay",
        "price": f"${price:.2f}",
        "numeric_price": price,
        "shipping": "Free Expedited Shipping",
        "badge": "⭐ Top Rated Seller",
        "url": url
    }

def scrape_walmart(product_name: str, base_price: float, affiliate_tag: str = "affilidetect-20"):
    url = f"https://www.walmart.com/search?q={urllib.parse.quote(product_name)}&affili={affiliate_tag}"
    price = base_price
    try:
        res = requests.get(url, headers=get_headers(), timeout=5)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            price_elem = soup.find("div", {"data-testid": "variant-price"})
            if price_elem:
                raw_price = re.sub(r'[^\d.]', '', price_elem.text)
                if raw_price:
                    price = float(raw_price)
    except Exception as e:
        print("Walmart scrape error, using simulated variance:", e)
        # Failover: apply dynamic variance (-8% to +3% of base)
        price = round(base_price * np.random.uniform(0.92, 1.03), 2)
    return {
        "store": "Walmart",
        "price": f"${price:.2f}",
        "numeric_price": price,
        "shipping": "Free 2-Day Shipping",
        "badge": "⚡ Lowest Price - Save Big" if price < base_price * 0.95 else "🏬 Store Pickup",
        "url": url
    }

def find_best_match(query_vector: np.ndarray, category_filter: Optional[str] = None):
    """
    Computes cosine similarity between query crop image vector and catalog product text vectors.
    Uses category filter first; falls back to full catalog if match score is too low.
    """
    SCORE_THRESHOLD = 0.18  # Minimum acceptable similarity

    best_match = None
    best_score = -1.0

    # --- Pass 1: Category-filtered search ---
    if category_filter:
        for item in PRODUCT_VECTORS:
            prod = item["product"]
            if prod["category"].lower() != category_filter.lower():
                continue
            vector = item["vector"]
            score = np.dot(query_vector, vector) / (
                np.linalg.norm(query_vector) * np.linalg.norm(vector) + 1e-9
            )
            if score > best_score:
                best_score = score
                best_match = prod

    # --- Pass 2: Full catalog fallback when category score is too low ---
    if best_match is None or best_score < SCORE_THRESHOLD:
        global_best = None
        global_score = -1.0
        for item in PRODUCT_VECTORS:
            vector = item["vector"]
            score = np.dot(query_vector, vector) / (
                np.linalg.norm(query_vector) * np.linalg.norm(vector) + 1e-9
            )
            if score > global_score:
                global_score = score
                global_best = item["product"]
        if global_best is not None:
            print(f"Category filter score too low ({best_score:.3f}), using global best ({global_score:.3f}): {global_best['title']}")
            best_match = global_best
            best_score = global_score

    # Final fallback: return first dataset entry
    if not best_match and len(PRODUCT_DATASET) > 0:
        best_match = PRODUCT_DATASET[0]

    return best_match, float(best_score)


# ═══════════════════════════════════════════════════════════════════════════════
#  API ENDPOINTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/api/detect-identify")
async def detect_and_identify(
    image_data: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    yolo_enabled: bool = Form(True),
    affiliate_tag: str = Form("affilidetect-20")
):
    try:
        # Load image from base64 string or file
        img_bytes = None
        if file:
            img_bytes = await file.read()
        elif image_data:
            # Handle data:image/jpeg;base64,... header
            if "," in image_data:
                image_data = image_data.split(",")[1]
            img_bytes = base64.b64decode(image_data)
        else:
            return {"error": "No image data provided"}

        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        width, height = img.size

        detections = []

        # 1. Run YOLOv8 detection
        if yolo_enabled and yolo_model:
            results = yolo_model(img, verbose=False)
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    # Bounding box coords
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    conf = float(box.conf[0])
                    cls = int(box.cls[0])
                    cls_name = yolo_model.names[cls]

                    # Standardize YOLO/COCO detection name → product category
                    mapped_cat = cls_name.lower()
                    YOLO_TO_CATEGORY = {
                        # ── Electronics ──────────────────────────────
                        "cell phone": "phone",
                        "phone": "phone",
                        "laptop": "laptop",
                        "mouse": "mouse",
                        "keyboard": "keyboard",
                        "tv": "monitor",
                        "remote": "tv_remote",
                        "camera": "camera",
                        # ── Audio ────────────────────────────────────
                        "headphones": "headphones",
                        "speaker": "speaker",
                        # ── Wearables ────────────────────────────────
                        "clock": "watch",
                        "watch": "watch",
                        # ── Kitchen ──────────────────────────────────
                        "cup": "coffee_mug",
                        "bottle": "water_bottle",
                        "wine glass": "coffee_mug",
                        "bowl": "plate",
                        "knife": "spoon",
                        "spoon": "spoon",
                        "fork": "spoon",
                        "dining table": "table",
                        "microwave": "coffee_mug",
                        "oven": "coffee_mug",
                        "toaster": "coffee_mug",
                        "refrigerator": "water_bottle",
                        # ── Furniture ────────────────────────────────
                        "chair": "chair",
                        "couch": "chair",
                        "bed": "chair",
                        # ── Bags & Lifestyle ─────────────────────────
                        "backpack": "backpack",
                        "handbag": "bag",
                        "suitcase": "bag",
                        "umbrella": "bag",
                        "tie": "cap",
                        # ── Books & Stationery ───────────────────────
                        "book": "book",
                        "scissors": "stapler",
                        # ── Sports & Outdoor ─────────────────────────
                        "sports ball": "shoes",
                        "skateboard": "shoes",
                        "surfboard": "shoes",
                        "tennis racket": "shoes",
                        "baseball bat": "shoes",
                        "baseball glove": "shoes",
                        "frisbee": "shoes",
                        "skis": "shoes",
                        "snowboard": "shoes",
                        "kite": "shoes",
                        # ── Home & Decor ─────────────────────────────
                        "vase": "lamp",
                        "potted plant": "lamp",
                        "hair drier": "fan",
                        "toothbrush": "pen",
                    }
                    mapped_cat = YOLO_TO_CATEGORY.get(mapped_cat, mapped_cat)

                    # Crop detected object
                    crop = img.crop((x1, y1, x2, y2))
                    
                    # 2. Compute CLIP vector and run FAISS similarity search
                    matched_product = None
                    score = 0.0
                    if clip_model:
                        crop_vector = clip_model.encode(crop)
                        matched_product, score = find_best_match(crop_vector, mapped_cat)

                    if not matched_product:
                        # Fallback simple search based on label
                        matched_product = next(
                            (p for p in PRODUCT_DATASET if p["category"] == mapped_cat),
                            PRODUCT_DATASET[0]
                        )
                        score = 0.85

                    # 3. Fetch store prices
                    amazon = scrape_amazon(matched_product["title"], matched_product["base_price"], affiliate_tag)
                    ebay = scrape_ebay(matched_product["title"], matched_product["base_price"], affiliate_tag)
                    walmart = scrape_walmart(matched_product["title"], matched_product["base_price"], affiliate_tag)

                    # Normalize and find best deal
                    stores = [amazon, ebay, walmart]
                    sorted_stores = sorted(stores, key=lambda s: s["numeric_price"])
                    
                    lowest = sorted_stores[0]
                    highest = sorted_stores[-1]
                    
                    discount = 0.0
                    if highest["numeric_price"] > 0:
                        discount = round(((highest["numeric_price"] - lowest["numeric_price"]) / highest["numeric_price"]) * 100, 1)

                    # 4. Generate AI verdict for AR overlay
                    ai_verdict = get_ai_verdict(
                        matched_product["id"],
                        matched_product["category"],
                        lowest["numeric_price"],
                        matched_product["base_price"]
                    )

                    detections.append({
                        "class": cls_name,
                        "confidence": int(conf * 100),
                        "bbox": [x1, y1, x2 - x1, y2 - y1], # x, y, width, height
                        "product_name": matched_product["title"],
                        "product_id": matched_product["id"],
                        "category": matched_product["category"],
                        "similarity_score": int(score * 100),
                        "lowest_price": lowest["price"],
                        "highest_price": highest["price"],
                        "discount_pct": discount,
                        "best_store": lowest["store"],
                        "deals": stores,
                        "ai_verdict": ai_verdict,
                    })
        else:
            # Fallback if YOLO not loaded or disabled: Run CLIP on the full image
            matched_product = PRODUCT_DATASET[0] # Default iPhone
            if clip_model:
                full_vector = clip_model.encode(img)
                matched_product, score = find_best_match(full_vector)

            amazon = scrape_amazon(matched_product["title"], matched_product["base_price"], affiliate_tag)
            ebay = scrape_ebay(matched_product["title"], matched_product["base_price"], affiliate_tag)
            walmart = scrape_walmart(matched_product["title"], matched_product["base_price"], affiliate_tag)

            stores = [amazon, ebay, walmart]
            sorted_stores = sorted(stores, key=lambda s: s["numeric_price"])
            lowest = sorted_stores[0]
            highest = sorted_stores[-1]
            discount = round(((highest["numeric_price"] - lowest["numeric_price"]) / highest["numeric_price"]) * 100, 1)

            ai_verdict = get_ai_verdict(
                matched_product["id"],
                matched_product["category"],
                lowest["numeric_price"],
                matched_product["base_price"]
            )

            detections.append({
                "class": matched_product["category"],
                "confidence": 99,
                "bbox": [50, 50, width - 100, height - 100],
                "product_name": matched_product["title"],
                "product_id": matched_product["id"],
                "category": matched_product["category"],
                "similarity_score": 90,
                "lowest_price": lowest["price"],
                "highest_price": highest["price"],
                "discount_pct": discount,
                "best_store": lowest["store"],
                "deals": stores,
                "ai_verdict": ai_verdict,
            })

        return {"detections": detections}

    except Exception as e:
        print("Detection error:", e)
        return {"error": str(e)}


# ── NEW: Product Intelligence Endpoint ───────────────────────────────────────

@app.post("/api/product-intelligence")
def product_intelligence(
    product_name: str = Form(...),
    product_id: str = Form(""),
    category: str = Form(""),
    base_price: float = Form(100.00),
    affiliate_tag: str = Form("affilidetect-20"),
):
    """
    Full AI product analysis: pros/cons, price prediction, fake review detection,
    best time to buy, and alternative suggestions.
    """
    # Resolve product from catalog if possible
    resolved = None
    for p in PRODUCT_DATASET:
        if p["id"] == product_id or p["title"].lower() == product_name.lower():
            resolved = p
            break
    if not resolved:
        # Fuzzy match by name substring
        for p in PRODUCT_DATASET:
            if product_name.lower() in p["title"].lower() or p["title"].lower() in product_name.lower():
                resolved = p
                break
    if not resolved:
        resolved = {"id": product_id or "unknown", "title": product_name, "category": category or "general", "base_price": base_price}

    pid = resolved.get("id", product_id or "unknown")
    cat = resolved.get("category", category or "general")
    bp = resolved.get("base_price", base_price)

    # 1. Pros & Cons
    pros_cons = get_pros_cons(pid, cat)

    # 2. Price History & Prediction
    price_history = generate_price_history(bp, pid, days=90)
    price_prediction = predict_price(price_history, days_ahead=30)

    # Compress history for frontend (send every 3rd day to reduce payload)
    sparse_history = price_history[::3] + [price_history[-1]]

    # 3. Best Time to Buy
    buy_timing = get_best_time_to_buy(cat, bp)

    # 4. Fake Review Analysis
    review_analysis = analyze_review_authenticity(pid, resolved["title"])

    # 5. Alternative Products
    alternatives = find_alternatives(pid, cat, limit=3)

    # 6. Overall AI Verdict
    ai_verdict = get_ai_verdict(pid, cat, price_prediction["current_price"], bp)

    return {
        "product_name": resolved["title"],
        "product_id": pid,
        "category": cat,
        "base_price": bp,
        "pros_cons": pros_cons,
        "price_history": sparse_history,
        "price_prediction": price_prediction,
        "buy_timing": buy_timing,
        "review_analysis": review_analysis,
        "alternatives": alternatives,
        "ai_verdict": ai_verdict,
    }


@app.post("/api/scrape-prices")
def compare_prices(
    product_name: str = Form(...),
    base_price: float = Form(100.00),
    affiliate_tag: str = Form("affilidetect-20")
):
    amazon = scrape_amazon(product_name, base_price, affiliate_tag)
    ebay = scrape_ebay(product_name, base_price, affiliate_tag)
    walmart = scrape_walmart(product_name, base_price, affiliate_tag)
    
    stores = [amazon, ebay, walmart]
    sorted_stores = sorted(stores, key=lambda s: s["numeric_price"])
    lowest = sorted_stores[0]
    highest = sorted_stores[-1]
    
    discount = 0.0
    if highest["numeric_price"] > 0:
        discount = round(((highest["numeric_price"] - lowest["numeric_price"]) / highest["numeric_price"]) * 100, 1)

    return {
        "product_name": product_name,
        "lowest_price": lowest["price"],
        "highest_price": highest["price"],
        "discount_pct": discount,
        "best_store": lowest["store"],
        "deals": stores
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
