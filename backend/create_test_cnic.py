"""
Generates a realistic synthetic Pakistani CNIC image for OCR testing.
Uses standard Pillow drawing to create high-contrast legible card text.
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_sample_cnic(output_path: str):
    # Card dimensions (standard ID-1 card aspect ratio, high resolution)
    width = 800
    height = 500
    image = Image.new("RGB", (width, height), color=(240, 248, 240))
    draw = ImageDraw.Draw(image)

    # Green header banner (characteristic of Pakistani CNIC)
    draw.rectangle([(0, 0), (width, 70)], fill=(0, 102, 51))

    # Header text
    draw.text((20, 15), "ISLAMIC REPUBLIC OF PAKISTAN", fill=(255, 255, 255))
    draw.text((20, 38), "National Identity Card", fill=(255, 255, 255))

    # Card fields
    fields = [
        ("Name", "MUHAMMAD ASIM"),
        ("Father Name", "MUHAMMAD IQBAL"),
        ("Gender", "M"),
        ("Country of Stay", "Pakistan"),
        ("Identity Number", "42101-1234567-1"),
        ("Date of Birth", "01.01.2002"),
        ("Date of Issue", "10.05.2020"),
        ("Date of Expiry", "10.05.2030"),
    ]

    y_start = 90
    y_step = 42

    for i, (label, val) in enumerate(fields):
        y = y_start + (i * y_step)
        draw.text((30, y), f"{label}:", fill=(80, 80, 80))
        draw.text((220, y), val, fill=(10, 10, 10))

    # Photo placeholder on the right
    draw.rectangle([(600, 100), (760, 320)], outline=(180, 180, 180), fill=(220, 230, 220), width=2)
    draw.text((630, 200), "[ PHOTO ]", fill=(100, 120, 100))

    # Chip placeholder
    draw.rectangle([(60, 440), (140, 480)], outline=(200, 170, 50), fill=(240, 220, 120), width=2)

    image.save(output_path, quality=95)
    print(f"Sample CNIC saved successfully to {output_path}")

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "test_cnic.png")
    create_sample_cnic(out)
