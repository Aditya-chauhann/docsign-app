import fitz
import os


def generate_signed_pdf_with_images(
    source_path: str,
    signatures: list,
    output_path: str,
    signer_name: str = "Signed",
    signature_image_path: str = None,
):
    """
    Embeds signature images (or text fallback) at exact fractional coordinates.
    No extra pages added — just the signature on the document itself.
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
            # Embed the actual PNG — transparent background preserved
            page.insert_image(rect, filename=signature_image_path, keep_proportion=True)
        else:
            # Text fallback — white box + bold italic name
            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
            page.draw_rect(rect, color=(0.2, 0.3, 0.8), width=1.2)
            page.insert_textbox(
                rect, signer_name,
                fontsize=min(14, ah * 0.55),
                fontname="tibo",
                color=(0.1, 0.15, 0.5),
                align=fitz.TEXT_ALIGN_CENTER,
            )

    doc.save(output_path, garbage=4, deflate=True, incremental=False)
    doc.close()
    return output_path