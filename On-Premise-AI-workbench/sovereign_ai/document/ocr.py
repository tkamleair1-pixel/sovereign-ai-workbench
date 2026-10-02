import fitz
import pytesseract
from PIL import Image
import io


def ocr_pdf(pdf_path):

    document = fitz.open(pdf_path)

    results = []

    for page_number, page in enumerate(document):

        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))

        image = Image.open(
            io.BytesIO(pix.tobytes("png"))
        )

        text = pytesseract.image_to_string(image)

        results.append({
            "page": page_number + 1,
            "text": text
        })

    return results