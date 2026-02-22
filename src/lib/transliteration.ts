
// Basic Devanagari to English Transliteration Logic
// Designed to handle Nepali names/text better than simple character replacement

export const transliterateToEnglish = (text: string): string => {
  if (!text) return '';
  
  // Normalize string to handle combined characters consistently
  // Also remove Zero Width Joiner/Non-Joiner if present to avoid mapping issues
  const input = text.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  // Mapping for Independent Vowels
  const vowels: Record<string, string> = {
    'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 
    'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 
    'अं': 'am', 'अः': 'ah'
  };

  // Mapping for Consonants (with inherent 'a')
  const consonants: Record<string, string> = {
    'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
    'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
    'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
    'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
    'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
    'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'wa',
    'श': 'sha', 'ष': 'sha', 'स': 'sa', 'ह': 'ha',
    'क्ष': 'ksha', 'त्र': 'tra', 'ज्ञ': 'gya', 'श्र': 'shra'
  };

  // Mapping for Dependent Vowels (Matras)
  // These replace the inherent 'a' of the previous consonant
  const matras: Record<string, string> = {
    'ा': 'aa', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 
    'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 
    'ं': 'n', 'ः': 'h', 'ँ': 'n', 
    '्': '' // Virama suppresses the inherent vowel
  };

  // Special handling for numerals
  const numerals: Record<string, string> = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
  };

  let result = '';
  const tokens = Array.from(input); // Split into characters correctly handling unicode

  for (let i = 0; i < tokens.length; i++) {
    const char = tokens[i];
    const nextChar = tokens[i + 1];

    // Handle Numerals
    if (numerals[char]) {
      result += numerals[char];
      continue;
    }

    // Handle Independent Vowels
    if (vowels[char]) {
      result += vowels[char];
      continue;
    }

    // Handle Consonants
    if (consonants[char]) {
      let trans = consonants[char];
      
      // Look ahead for matras or virama
      if (nextChar && matras[nextChar] !== undefined) {
        // If next char is a matra or virama, remove the inherent 'a'
        // But only if the consonant mapping ends in 'a' (which they all do in our map)
        if (trans.endsWith('a')) {
          trans = trans.slice(0, -1);
        }
        
        // If it's a Virama, we just keep the consonant without 'a'
        // The Virama itself maps to '' so it won't add anything in the next iteration
      } 
      // Schwa deletion (simplified):
      // If word ends with a consonant, drop the 'a'
      // Checking if it's the last character or followed by space/punctuation
      else if (!nextChar || /[\s\.,\-]/.test(nextChar)) {
        if (trans.endsWith('a') && trans.length > 1) {
             trans = trans.slice(0, -1);
        }
      }

      result += trans;
      continue;
    }

    // Handle Matras (when processed as main char - usually handled in lookahead)
    // But we still need to append the matra value itself
    if (matras[char] !== undefined) {
      result += matras[char];
      continue;
    }
    
    // Explicit fail-safe for Virama (U+094D) if it somehow missed the map
    if (char.charCodeAt(0) === 0x094D) {
      continue;
    }

    // Pass through other characters (spaces, english, punctuation)
    result += char;
  }

  // Post-processing to clean up common issues
  // Example: 'aa' at end of word might be better as 'a' in some conventions, but let's stick to literal for now.
  // Capitalize first letter of each word
  return result.replace(/\b\w/g, c => c.toUpperCase());
};
