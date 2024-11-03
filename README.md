# OCR Kartu Tanda Penduduk (KTP)

OCR application to extract information from Indonesian ID Card (KTP) using Tesseract.js

## Features

- Extract text from KTP images
- Parse extracted text into structured data
- Support for common KTP fields (NIK, Name, Address, etc.)
- Image preprocessing for better OCR accuracy

## Prerequisites

- Node.js (v12 or higher)
- GraphicsMagick or ImageMagick installed on your system

## Installation

1. Clone the repository:

```bash
git clone https://github.com/ganeshaampuh/ocr-ktp.git
```

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm start
```

## Usage

- Upload an image of a KTP card
- The application will extract the text and parse it into structured data
- The structured data will be displayed in the response

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.