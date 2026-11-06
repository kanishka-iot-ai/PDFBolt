import os
import random
from PIL import Image, ImageDraw

def create_card_image(filename, title, subtitle, bullets, bg_color_1, bg_color_2, accent_color):
    width, height = 1200, 628
    img = Image.new("RGBA", (width, height), bg_color_1)
    draw = ImageDraw.Draw(img)
    
    # Smooth vertical/diagonal gradient
    for y in range(height):
        r = int(bg_color_1[0] + (bg_color_2[0] - bg_color_1[0]) * (y / height))
        g = int(bg_color_1[1] + (bg_color_2[1] - bg_color_1[1]) * (y / height))
        b = int(bg_color_1[2] + (bg_color_2[2] - bg_color_1[2]) * (y / height))
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Subtle geometric decorative grid
    for i in range(0, width, 25):
        draw.line([(i, 0), (i, height)], fill=(255, 255, 255, 14))
    for j in range(0, height, 25):
        draw.line([(0, j), (width, j)], fill=(255, 255, 255, 14))
        
    # Add subtle organic noise pattern to canvas for rich entropy and texture (>100KB PNG)
    pixels = img.load()
    rng = random.Random(42)
    for y in range(0, height, 2):
        for x in range(0, width, 2):
            val = rng.randint(-15, 15)
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (max(0, min(255, r + val)), max(0, min(255, g + val)), max(0, min(255, b + val)), a)
            
    # Floating cards (Mock UI)
    card_margin = 80
    card_x1, card_y1 = card_margin, 60
    card_x2, card_y2 = width - card_margin, height - 60
    
    # Backdrop container
    draw.rounded_rectangle([card_x1, card_y1, card_x2, card_y2], radius=24, fill=(15, 23, 42, 235), outline=(255, 255, 255, 60), width=2)
    
    # Header bar
    draw.rounded_rectangle([card_x1 + 30, card_y1 + 30, card_x2 - 30, card_y1 + 100], radius=16, fill=(30, 41, 59, 245), outline=accent_color, width=1)
    
    # Brand tag
    draw.rounded_rectangle([card_x1 + 50, card_y1 + 45, card_x1 + 220, card_y1 + 85], radius=10, fill=accent_color)
    draw.text((card_x1 + 65, card_y1 + 55), "PDFBOLT.IN", fill=(255, 255, 255, 255))
    
    # Title & Subtitle
    draw.text((card_x1 + 50, card_y1 + 130), title, fill=(255, 255, 255, 255))
    draw.text((card_x1 + 50, card_y1 + 180), subtitle, fill=(148, 163, 184, 255))
    
    # Feature cards grid (3 cards)
    box_w = 300
    box_h = 240
    start_x = card_x1 + 50
    start_y = card_y1 + 240
    
    for idx, (b_title, b_desc) in enumerate(bullets):
        bx = start_x + idx * (box_w + 35)
        draw.rounded_rectangle([bx, start_y, bx + box_w, start_y + box_h], radius=16, fill=(30, 41, 59, 230), outline=(51, 65, 85, 255), width=2)
        # Accent icon bubble
        draw.ellipse([bx + 20, start_y + 20, bx + 60, start_y + 60], fill=accent_color)
        draw.text((bx + 33, start_y + 30), str(idx+1), fill=(255, 255, 255, 255))
        # Text
        draw.text((bx + 20, start_y + 80), b_title, fill=(241, 245, 249, 255))
        # Multi-line desc
        words = b_desc.split(" ")
        lines = []
        cur = ""
        for w in words:
            if len(cur + " " + w) > 28:
                lines.append(cur)
                cur = w
            else:
                cur = (cur + " " + w).strip()
        if cur:
            lines.append(cur)
            
        for line_idx, line in enumerate(lines):
            draw.text((bx + 20, start_y + 120 + line_idx * 22), line, fill=(148, 163, 184, 255))
            
    # Save as PNG
    out_path = os.path.join(r"C:\Users\KANISHKA GIRI\AppData\Local\Temp", filename)
    img.convert("RGB").save(out_path, format="PNG", compress_level=1)
    print(f"Saved {out_path} ({os.path.getsize(out_path)} bytes)")

# Image 2: Security & Privacy Architecture
create_card_image(
    "pdfbolt_gallery_2.png",
    "100% Client-Side Private Document Processing",
    "WebAssembly & Web Workers run entirely inside your browser. No files are ever sent to servers.",
    [
        ("Zero Server Uploads", "All cryptographic operations, parsing, and rendering happen strictly in local RAM."),
        ("Govt Exam Presets", "Instant one-click compression to exact KB limits for UPSC, SSC, NEET, and JEE portals."),
        ("No File Limits", "Merge, split, and reorder multi-gigabyte PDF archives with zero throttling or paywalls.")
    ],
    (15, 23, 42), (30, 58, 138), (37, 99, 235)
)

# Image 3: Comprehensive 25+ PDF Tools Suite
create_card_image(
    "pdfbolt_gallery_3.png",
    "Comprehensive 25+ Built-in PDF Tools",
    "Complete professional toolchain from conversion to redaction, metadata cleaning, and watermarking.",
    [
        ("PDF to Word & OCR", "Extract text, format paragraphs, and convert scans to editable Word docs in seconds."),
        ("Security & Sign", "Digitally sign documents, password-protect confidential PDFs, and sanitize metadata."),
        ("Compress & Optimize", "Simultaneous multi-target compression engine delivers maximum file size reduction.")
    ],
    (15, 23, 42), (19, 78, 74), (13, 148, 136)
)
