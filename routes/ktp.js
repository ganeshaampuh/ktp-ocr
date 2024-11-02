const express = require("express");
const router = express.Router();
const { createWorker } = require("tesseract.js");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

function nikExtract(word) {
  const wordDict = { 'b': "6", 'e': "2" };
  return [...word].map(letter => wordDict[letter] || letter).join('');
}

function wordToNumberConverter(word) {
  const wordDict = { '|': "1" };
  return [...word].map(letter => wordDict[letter] || letter).join('');
}

function extract(extractedResult) {
  const result = {};
  try {
    extractedResult.split("\n").forEach(word => {
      if (word.includes("NIK")) {
          const [, nik] = word.split(':');
          result.nik = nikExtract(nik?.replace(/\s+/g, '') || '');
      } else if (word.includes("Nama")) {
          const [, nama] = word.split(':');
          result.nama = nama?.replace('Nama ', '')?.trim() || '';
      } else if (word.includes("Tempat")) {
          const [, detail] = word.split(':') || ['', ''];
          const birthDateMatch = detail?.match(/(\d{2}-\d{2}-\d{4})/);
          result.tanggal_lahir = birthDateMatch ? birthDateMatch[0] : '';
          result.tempat_lahir = detail?.replace(result.tanggal_lahir, '')?.trim() || '';
      } else if (word.includes("Darah")) {
          const genderMatch = word?.match(/(LAKI-LAKI|LAKI|LELAKI|PEREMPUAN)/);
          result.jenis_kelamin = genderMatch ? genderMatch[0] : '';
          const [, bloodType] = word.split(':') || ['', ''];
          result.golongan_darah = bloodType && /O|A|B|AB/.test(bloodType) ? bloodType.match(/O|A|B|AB/)[0] : '-';
      } else if (word.includes("Alamat")) {
          result.alamat = wordToNumberConverter(word?.replace("Alamat ", "") || '');
      } else if (word.includes("NO.")) {
          result.alamat += ' ' + word;
      } else if (word.includes("Kecamatan")) {
          const [, kecamatan] = word.split(':') || ['', ''];
          result.kecamatan = kecamatan?.trim() || '';
      } else if (word.includes("Desa")) {
          const words = word?.split(' ') || [];
          const desa = words.filter(w => !/desa/i.test(w));
          result.kelurahan_atau_desa = desa.join(' ')?.trim() || '';
      } else if (word.includes("Kewarganegaraan")) {
          const [, kewarganegaraan] = word.split(':') || ['', ''];
          result.kewarganegaraan = kewarganegaraan?.trim() || '';
      } else if (word.includes("Pekerjaan")) {
          const words = word?.split(' ') || [];
          const pekerjaan = words.filter(w => !w.includes('-'));
          result.pekerjaan = pekerjaan.join(' ')?.replace('Pekerjaan', '')?.trim() || '';
      } else if (word.includes("Agama")) {
          result.agama = word?.replace("Agama", "")?.trim() || '';
      } else if (word.includes("Perkawinan")) {
          const [, statusPerkawinan] = word.split(':') || ['', ''];
          result.status_perkawinan = statusPerkawinan?.trim() || '';
      } else if (word.includes("RTRW")) {
          const [rt, rw] = word?.replace("RTRW", '')?.split('/') || ['', ''];
          result.rt = rt?.trim() || '';
          result.rw = rw?.trim() || '';
      }
    });
  } catch (error) {
    console.error('Error extracting KTP data:', error);
  }

  return result;
}


router.post("/", upload.single("image"), async function (request, response, next) {
  try {
      const worker = await createWorker("ind");
      const imagePath = request.file.path;
      const tempPath = "uploads/" + path.basename(imagePath) + ".jpeg";

      console.log(imagePath);
      console.log(tempPath);

      // Ensure uploads directory exists
      if (!fs.existsSync("uploads")) {
        fs.mkdirSync("uploads");
      }

      await sharp(imagePath)
        .grayscale(true)
        .sharpen()
        .toFormat("jpeg")
        .toFile(tempPath)
        .then(() => console.log("success"))
        .catch(err => console.log(err));

      const {
        data: { text: rawTextExtracted },
      } = await worker.recognize(tempPath);

      console.log(rawTextExtracted);

      const cleanResOCR = extract(rawTextExtracted);

      console.log(cleanResOCR);

      // Cleanup temporary files
      fs.unlinkSync(imagePath);
      fs.unlinkSync(tempPath);

      response.send(cleanResOCR);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
