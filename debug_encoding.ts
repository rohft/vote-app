
import { transliterateToEnglish } from './src/lib/transliteration';
import * as fs from 'fs';
import * as path from 'path';

// Read the file content
const filePath = path.join(__dirname, 'src', 'lib', 'transliteration.ts');
const fileContent = fs.readFileSync(filePath, 'utf-8');

// Find the matras section and look for the virama
const matraRegex = /'्':/g;
const match = matraRegex.exec(fileContent);

if (match) {
    console.log("Found Virama key in source code.");
    const char = match[0][1];
    console.log(`Character code in file: ${char.charCodeAt(0).toString(16)}`);
} else {
    console.log("Could not find Virama key in source code via regex.");
}

// Also test the function
const res = transliterateToEnglish("तन्डुकार");
console.log(`Transliteration result: ${res}`);
for (let i = 0; i < res.length; i++) {
    console.log(`Res char ${i}: ${res[i]} (${res.charCodeAt(i).toString(16)})`);
}
