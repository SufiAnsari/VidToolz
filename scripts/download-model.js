const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_ID = 'Xenova/whisper-tiny.en';
const FILES = [
    'config.json',
    'generation_config.json',
    'preprocessor_config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'vocab.json',
    'added_tokens.json',
    'special_tokens_map.json',
    'normalizer.json',
    'onnx/encoder_model_quantized.onnx',
    'onnx/decoder_model_quantized.onnx',
    'onnx/decoder_with_past_model_quantized.onnx'
];

const BASE_URL = `https://huggingface.co/${MODEL_ID}/resolve/main/`;
const OUTPUT_DIR = path.join(__dirname, '../public/models', MODEL_ID);

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const downloadFile = (filename) => {
    const url = BASE_URL + filename;
    // Save flat in the output dir, removing 'onnx/' prefix if present
    const flatFilename = filename.split('/').pop();
    const dest = path.join(OUTPUT_DIR, flatFilename);
    const file = fs.createWriteStream(dest);

    console.log(`Downloading ${filename} from ${url}...`);

    const handleResponse = (response) => {
        if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`Downloaded ${filename}`);
            });
        } else if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
            // Handle redirect
            const redirectUrl = new URL(response.headers.location, BASE_URL).toString();
            console.log(`Redirecting ${filename} to ${redirectUrl}`);
            https.get(redirectUrl, handleResponse).on('error', (err) => {
                console.error(`Error on redirect for ${filename}: ${err.message}`);
                fs.unlink(dest, () => { });
            });
        } else {
            console.error(`Failed to download ${filename}: Status ${response.statusCode}`);
            fs.unlink(dest, () => { });
        }
    };

    https.get(url, handleResponse).on('error', (err) => {
        fs.unlink(dest, () => { });
        console.error(`Error downloading ${filename}: ${err.message}`);
    });
};

FILES.forEach(file => {
    downloadFile(file);
});
