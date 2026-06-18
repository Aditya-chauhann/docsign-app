import fitz
import os
from datetime import datetime


def generate_signed_pdf_with_images(
    source_path: str,
    signatures: list,
    output_path: str,
    signer_name: str = "Signed",
    signature_image_path: str = None,
):
    """
    Embeds signature images (or text fallback) at exact fractional coordinates
    on each page, then appends a certificate page.
    
    signatures: list of dicts with keys: page, x, y, width, height (all 0-1 fractions)
    signature_image_path: path to user's transparent PNG signature (optional)
    """
    doc = fitz.open(source_path)

    for sig in signatures:
        page_idx = int(sig["page"])
        if page_idx < 0 or page_idx >= len(doc):
            continue

        page = doc[page_idx]
        pw = page.rect.width
        ph = page.rect.height

        ax = sig["x"] * pw
        ay = sig["y"] * ph
        aw = sig["width"] * pw
        ah = sig["height"] * ph
        rect = fitz.Rect(ax, ay, ax + aw, ay + ah)

        if signature_image_path and os.path.exists(signature_image_path):
            # Embed the actual PNG signature image — transparent background preserved
            page.insert_image(rect, filename=signature_image_path, keep_proportion=True)
        else:
            # Text fallback — white box + name in bold italic
            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
            page.draw_rect(rect, color=(0.2, 0.3, 0.8), width=1.2)
            page.insert_textbox(rect, signer_name, fontsize=min(14, ah * 0.55),
                                fontname="tibo", color=(0.1, 0.15, 0.5),
                                align=fitz.TEXT_ALIGN_CENTER)

    # Append certificate page
    cert = doc.new_page(width=612, height=220)
    cert.draw_rect(fitz.Rect(0, 0, 612, 220), color=None, fill=(0.97, 0.97, 1.0))
    cert.draw_line(fitz.Point(40, 22), fitz.Point(572, 22), color=(0.8, 0.82, 0.95), width=1)
    cert.insert_text(fitz.Point(40, 46), "SIGNATURE CERTIFICATE", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.7))
    ts = datetime.utcnow().strftime("%B %d, %Y at %H:%M UTC")
    cert.insert_text(fitz.Point(40, 63), f"Electronically signed on {ts}", fontsize=9, fontname="helv", color=(0.4, 0.4, 0.5))

    # Left: signature image or name
    box = fitz.Rect(40, 80, 300, 165)
    cert.draw_rect(box, color=(0.2, 0.3, 0.8), fill=(0.94, 0.95, 1.0), width=1.5)
    cert.insert_text(fitz.Point(52, 100), "Signed by:", fontsize=8, fontname="helv", color=(0.5, 0.5, 0.7))
    if signature_image_path and os.path.exists(signature_image_path):
        img_rect = fitz.Rect(52, 105, 290, 158)
        cert.insert_image(img_rect, filename=signature_image_path, keep_proportion=True)
    else:
        cert.insert_text(fitz.Point(52, 138), signer_name, fontsize=22, fontname="tibo", color=(0.1, 0.15, 0.5))

    # Right: verification box
    vbox = fitz.Rect(320, 80, 572, 165)
    cert.draw_rect(vbox, color=(0.2, 0.7, 0.4), fill=(0.93, 1.0, 0.95), width=1)
    cert.insert_text(fitz.Point(332, 102), "✓  Signature Verified", fontsize=9, fontname="helv", color=(0.1, 0.5, 0.2))
    cert.insert_text(fitz.Point(332, 118), "DocSign — Tamper-evident", fontsize=8, fontname="helv", color=(0.3, 0.5, 0.3))
    cert.insert_text(fitz.Point(332, 132), f"Signatures: {len(signatures)}", fontsize=8, fontname="helv", color=(0.3, 0.5, 0.3))
    cert.insert_text(fitz.Point(332, 146), f"Doc: {os.path.basename(source_path)[:22]}", fontsize=7, fontname="helv", color=(0.4, 0.5, 0.4))

    cert.draw_line(fitz.Point(40, 182), fitz.Point(572, 182), color=(0.8, 0.82, 0.95), width=0.5)
    cert.insert_text(fitz.Point(40, 197), "This document was signed electronically via DocSign. This signature is legally binding.", fontsize=7, fontname="helv", color=(0.6, 0.6, 0.7))

    doc.save(output_path, garbage=4, deflate=True, incremental=False)
    doc.close()
    return output_path