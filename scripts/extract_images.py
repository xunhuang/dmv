
import fitz  # PyMuPDF
import base64

pdf_path = "./images.pdf"
output_html_path = "./extracted_signs.html"

# Open the PDF
doc = fitz.open(pdf_path)

html_output = (
    "<html>\n<head>\n"
    "<meta charset='UTF-8'/>\n"
    "<title>Extracted Road Signs</title>\n"
    "</head>\n<body>\n"
    "<h1>Extracted Road Signs from PDF</h1>\n"
)

sign_counter = 1

for page_index in range(len(doc)):
    page = doc[page_index]
    image_blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 1]
    # print(image_blocks)
    for block in image_blocks:
        print(block["bbox"])
    # Convert page into pixel data
    zoom_factor = 2  # Increase for higher resolution
    mat = fitz.Matrix(zoom_factor, zoom_factor)
    pix = page.get_pixmap(matrix=mat, alpha=False)

    # Get pixel data dimensions
    width, height = pix.width, pix.height
    print(f"Page {page_index + 1} converted to pixel data: {width}x{height} pixels")
    
    # Extract images from blocks using bbox coordinates
    for block in image_blocks:
        bbox = block["bbox"]
        # Scale bbox coordinates according to zoom factor
        x0, y0, x1, y1 = [int(coord * zoom_factor) for coord in bbox]
        
        # Calculate width and height of the region
        width = x1 - x0
        height = y1 - y0
        
        # Create a new pixmap for the region
        sub_pix = fitz.Pixmap(pix.colorspace, (0, 0, width, height), pix.alpha)
        
        # Copy pixels from source to destination
        for y in range(height):
            for x in range(width):
                pixel = pix.pixel(x0 + x, y0 + y)
                sub_pix.set_pixel(x, y, pixel)
        
        # Convert to PNG bytes
        png_bytes = sub_pix.tobytes("png")
        
        # Convert to Base64
        encoded = base64.b64encode(png_bytes).decode("utf-8")
        
        # Create HTML snippet for this image
        html_output += f"<h2>Sign {sign_counter} (Page {page_index + 1})</h2>\n"
        html_output += f"<img src='data:image/png;base64,{encoded}' alt='Sign {sign_counter}' />\n"
        
        sign_counter += 1

html_output += "</body>\n</html>"

# Write it all to an HTML file
with open(output_html_path, "w", encoding="utf-8") as f:
    f.write(html_output)

print("Extraction complete! The file 'extracted_signs.html' has been generated.")


