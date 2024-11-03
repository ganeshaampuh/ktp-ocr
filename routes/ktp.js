const express = require("express");
const router = express.Router();
const { createWorker } = require("tesseract.js");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const gm = require("gm");

function parseKTPData(text) {
  const ktpData = {};

  // Regex patterns for each field
  const patterns = {
    provinsi: /PROVINSI\s+([A-Z\s]+)/,
    kabupaten: /KABUPATEN\s+([A-Z\s]+)/,
    ktpNumber: /\b\d{16}\b/,
    name: /\b[A-Z\s]+\b/,
    birthPlace: /\b[A-Z\s]+\b/,
    birthDate: /\b\d{2}[- ]\d{2}[- ]\d{4}\b/,
    gender: /\b(LAKI(?:-LAKI)?|PRIA|PEREMPUAN|WANITA)\b/,
    bloodType: /GolDarah\s([A|B|AB|O])/,
    address: /JL\s+([A-Z0-9\s]+)/,
    rtrw: /\b(\d{3})\/(\d{3})\b/,
    village: /\bCIBENTANG|CIBENTANG\b/, // Adjust as needed for known village names
    district: /\bCISEENG\b/, // Adjust as needed for known district names
    religion: /\bISLAM|KRISTEN|KATOLIK|HINDU|BUDDHA\b/,
    maritalStatus: /\bBELUM KAWIN|KAWIN|CERAI\b/,
    occupation: /\bWIRASWASTA|PEGAWAI\b/, // Add common occupations
    nationality: /\bWNI|WNA\b/,
    issueDate: /\b\d{2}-\d{2}-\d{4}\b/,
  };

  // Extract fields using regex patterns
  ktpData.provinsi = text.split("\n")[0]?.trim();
  ktpData.kabupaten = text.split("\n")[1]?.trim();
  ktpData.ktpNumber = (text.match(patterns.ktpNumber) || [])[0];
  ktpData.name = text.split("\n")[3]?.trim();
  const birthPlace = text.split("\n")[4]?.trim().match(patterns.birthPlace);
  const birthDate = text.split("\n")[4]?.trim().match(patterns.birthDate);
  ktpData.birthPlace = birthPlace ? birthPlace[0] : "";
  ktpData.birthDate = birthDate ? birthDate[0].replace(/ /g, "-") : "";
  ktpData.gender = (text.match(patterns.gender) || [])[0];
  ktpData.bloodType = (text.match(patterns.bloodType) || [])[1];
  ktpData.address = text.split("\n")[6]?.trim();
  const rtrwMatch = text.match(patterns.rtrw);
  if (rtrwMatch) {
    ktpData.rt = rtrwMatch[1];
    ktpData.rw = rtrwMatch[2];
  }
  ktpData.village = (text.match(patterns.village) || [])[0];
  ktpData.district = (text.match(patterns.district) || [])[0];
  ktpData.religion = (text.match(patterns.religion) || [])[0];
  ktpData.maritalStatus = (text.match(patterns.maritalStatus) || [])[0];
  ktpData.occupation = (text.match(patterns.occupation) || [])[0];
  ktpData.nationality = (text.match(patterns.nationality) || [])[0];
  ktpData.issueDate = (text.match(patterns.issueDate) || [])[0];

  return ktpData;
}

router.post(
  "/",
  upload.single("image"),
  async function (request, response, next) {
    try {
      const worker = await createWorker();
      await worker.load();
      await worker.loadLanguage("ind");
      await worker.initialize("ind");
      await worker.setParameters({
        tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-, ",
        preserve_interword_spaces: "1",
        user_defined_dpi: "600",
      });

      const imagePath = request.file.path;
      const tempPath = "uploads/" + path.basename(imagePath) + ".jpeg";

      // Ensure uploads directory exists
      if (!fs.existsSync("uploads")) {
        fs.mkdirSync("uploads");
      }

      await gm(imagePath)
        .density(600, 600) // Increase DPI
        .resizeExact(1200, 755) // Resize with ratio
        .quality(100)
        .crop(569, 647, 266, 5) // Crop to trim only text part
        .autoOrient()
        .quality(100)
        .colorspace("GRAY") // Make picture grayscale
        .threshold("40", "Threshold-White") // Make picture black&white
        .quality(100)
        .write(tempPath, async function (err) {
          if (err) console.log(err);

          const {
            data: { text: rawTextExtracted },
          } = await worker.recognize(tempPath);

          console.log(rawTextExtracted);

          // Cleanup temporary files
          fs.unlinkSync(imagePath);
          fs.unlinkSync(tempPath);

          await worker.terminate();

          response.send(parseKTPData(rawTextExtracted));
        });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
