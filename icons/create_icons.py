#!/usr/bin/env python3
"""
Create PNG icons for BlueHawk API Key Finder extension from SVG or programmatically.
Requires: pip install cairosvg pillow
"""

import os
import sys

# Try to use cairosvg for SVG to PNG conversion
try:
    import cairosvg
    HAS_CAIROSVG = True
except ImportError:
    HAS_CAIROSVG = False
    print("cairosvg not available, using PIL fallback")

from PIL import Image, ImageDraw

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def create_hawk_icon_pil(size):
    """Create a hawk icon programmatically using PIL as fallback."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background with rounded corners (approximated)
    radius = int(size * 0.19)
    draw.rounded_rectangle([0, 0, size-1, size-1], radius=radius, fill='#1e3a5f')

    # Scale factor
    s = size / 128

    # Simple hawk silhouette (orange/amber color)
    hawk_color = '#f59e0b'

    # Draw a simplified hawk shape
    # Head
    head_points = [
        (int(85*s), int(30*s)),
        (int(100*s), int(45*s)),
        (int(90*s), int(55*s)),
        (int(75*s), int(50*s)),
        (int(65*s), int(40*s)),
        (int(70*s), int(28*s)),
    ]
    draw.polygon(head_points, fill=hawk_color)

    # Body
    body_points = [
        (int(65*s), int(40*s)),
        (int(50*s), int(55*s)),
        (int(45*s), int(75*s)),
        (int(55*s), int(90*s)),
        (int(80*s), int(85*s)),
        (int(90*s), int(70*s)),
        (int(85*s), int(55*s)),
        (int(75*s), int(50*s)),
    ]
    draw.polygon(body_points, fill=hawk_color)

    # Eye
    eye_x, eye_y = int(82*s), int(38*s)
    eye_r = max(2, int(4*s))
    draw.ellipse([eye_x-eye_r, eye_y-eye_r, eye_x+eye_r, eye_y+eye_r], fill='#0d1b2a')

    # Key symbol (green)
    key_color = '#22c55e'
    key_y = int(95*s)
    key_x = int(25*s)
    key_r = max(3, int(8*s))
    key_w = max(2, int(3*s))

    # Key ring
    draw.ellipse([key_x-key_r, key_y-key_r, key_x+key_r, key_y+key_r],
                 outline=key_color, width=key_w)

    # Key shaft
    shaft_start = key_x + key_r
    shaft_end = int(65*s)
    draw.rectangle([shaft_start, key_y-key_w, shaft_end, key_y+key_w], fill=key_color)

    # Key teeth
    tooth_w = max(2, int(3*s))
    tooth_h = max(3, int(6*s))
    draw.rectangle([shaft_end-tooth_w*3, key_y-key_w-tooth_h, shaft_end-tooth_w*2, key_y-key_w], fill=key_color)
    draw.rectangle([shaft_end-tooth_w, key_y-key_w-tooth_h, shaft_end, key_y-key_w], fill=key_color)

    return img

def create_icons_from_svg():
    """Create PNG icons from SVG using cairosvg."""
    svg_path = os.path.join(SCRIPT_DIR, 'icon.svg')

    if not os.path.exists(svg_path):
        print(f"SVG file not found: {svg_path}")
        return False

    sizes = [16, 48, 128]
    for size in sizes:
        output_path = os.path.join(SCRIPT_DIR, f'icon{size}.png')
        cairosvg.svg2png(
            url=svg_path,
            write_to=output_path,
            output_width=size,
            output_height=size
        )
        print(f"Created icon{size}.png from SVG")

    return True

def create_icons_with_pil():
    """Create PNG icons using PIL (fallback)."""
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_hawk_icon_pil(size)
        output_path = os.path.join(SCRIPT_DIR, f'icon{size}.png')
        icon.save(output_path, 'PNG')
        print(f"Created icon{size}.png using PIL")

    return True

def main():
    print("Creating BlueHawk API Key Finder icons...")

    if HAS_CAIROSVG:
        success = create_icons_from_svg()
        if not success:
            print("Falling back to PIL...")
            create_icons_with_pil()
    else:
        create_icons_with_pil()

    print("Done! Icons created successfully.")

if __name__ == '__main__':
    main()
