import json
import csv
import re
import sys
import unidecode
import smartypants
import spacy
from spacy.util import compile_infix_regex, compile_prefix_regex, compile_suffix_regex, filter_spans
from spacy.tokens import Doc, Span
from spacy.matcher import PhraseMatcher
from bs4 import BeautifulSoup


class LatinToShavian:
    """A class for converting Latin text to Shavian script."""
    
    def __init__(self, readlex_path="readlex/readlex_converter.json", phrases_path="readlex/readlex_converter_phrases.json"):
        """Initialize the converter with dictionaries and spaCy model."""
        self.readlex_path = readlex_path
        self.phrases_path = phrases_path
        
        # Load ReadLex dictionary
        with open(self.readlex_path, 'r', encoding="utf-8") as file:
            json_data = file.read()
        self.readlex_dict: dict[str, list[dict[str, str]]] = json.loads(json_data)

        # Categories of letters that determine how a following 's is pronounced
        self.s_follows: set[str] = {"𐑐", "𐑑", "𐑒", "𐑓", "𐑔"}
        self.uhz_follows: set[str] = {"𐑕", "𐑖", "𐑗", "𐑟", "𐑠", "𐑡"}
        self.z_follows: set[str] = {"𐑚", "𐑛", "𐑜", "𐑝", "𐑞", "𐑙", "𐑤", "𐑥", "𐑯", "𐑸", "𐑹", "𐑺", "𐑻", "𐑼", "𐑽"}
        self.consonants = set.union(self.s_follows, self.uhz_follows, self.z_follows)

        # Contractions that need special treatment since the separate words are not as they appear in the dictionary
        self.contraction_start: dict[str, str] = {
            "ai": "𐑱", "ca": "𐑒𐑭", "do": "𐑛𐑴", "does": "𐑛𐑳𐑟", "did": "𐑛𐑦𐑛", "sha": "𐑖𐑭",
            "wo": "𐑢𐑴", "y'": "𐑘"
        }
        self.contraction_end: dict[str, str] = {
            "n't": "𐑯𐑑", "all": "𐑷𐑤", "'ve": "𐑝", "'ll": "𐑤", "'m": "𐑥", "'d": "𐑛", "'re": "𐑼"
        }

        # Common prefixes and suffixes used in new coinings
        self.prefixes: dict[str, str] = {
            "anti": "𐑨𐑯𐑑𐑦", "counter": "𐑒𐑬𐑯𐑑𐑼", "de": "𐑛𐑰", "dis": "𐑛𐑦𐑕",
            "esque": "𐑧𐑕𐑒", "hyper": "𐑣𐑲𐑐𐑼", "hypo": "𐑣𐑲𐑐𐑴", "mega": "𐑥𐑧𐑜𐑩",
            "meta": "𐑥𐑧𐑑𐑩", "micro": "𐑥��𐑒𐑮𐑴", "multi": "𐑳𐑤𐑑𐑦", "mis": "𐑥𐑦𐑕",
            "neuro": "𐑯𐑘𐑫𐑼𐑴", "non": "𐑯𐑪𐑯", "o'er": "𐑴𐑼", "out": "𐑬𐑑", "over": "𐑴𐑝𐑼",
            "poly": "𐑐𐑪𐑤𐑦", "post": "𐑐𐑴𐑕𐑑", "pre": "𐑐𐑮𐑰", "pro": "𐑐𐑮𐑴",
            "pseudo": "𐑕𐑿𐑛𐑴", "re": "𐑮𐑰", "sub": "𐑕𐑳𐑚", "super": "𐑕𐑵𐑐𐑼",
            "ultra": "𐑳𐑤𐑑𐑮𐑩", "un": "𐑳𐑯", "under": "𐑳𐑯𐑛𐑼"
        }
        self.suffixes: dict[str, str] = {
            "able": "𐑩𐑚𐑩𐑤", "bound": "𐑚𐑬𐑯𐑛", "ful": "𐑓𐑩𐑤", "hood": "𐑣𐑫𐑛",
            "ish": "𐑦𐑖", "ism": "𐑦𐑟𐑩𐑥", "less": "𐑤𐑩𐑕", "like": "𐑤𐑲𐑒", "ness": "𐑯𐑩𐑕"
        }
        self.affixes: dict[str, str] = self.prefixes | self.suffixes

        # Words that sometimes change spelling before 'to'
        self.have_to: dict[str, str] = {"have": "𐑣𐑨𐑓", "has": "𐑣𐑨𐑕"}
        self.vbd_to: dict[str, str] = {"used": "𐑿𐑕𐑑", "unused": "𐑳𐑯𐑿𐑕𐑑", "supposed": "𐑕𐑩𐑐𐑴𐑕𐑑"}
        self.before_to: dict[str, str] = self.have_to | self.vbd_to

        # Suffixes that follow numerals in ordinal numbers
        self.ordinal_suffixes: dict[str, str] = {"st": "𐑕𐑑", "nd": "𐑯𐑛", "rd": "𐑮𐑛", "th": "𐑔", "s": "𐑟"}

        # Entity types that get namer dots
        self.namer_dot_ents: set[str] = {"PERSON", "FAC", "ORG", "GPE", "LOC", "PRODUCT", "EVENT", "WORK_OF_ART", "LAW"}

        # Initialize phonetic mapping
        self._initialize_phonetic_mapping()
        
        # Initialize spaCy
        self._initialize_spacy()
        
    def _initialize_phonetic_mapping(self):
        """Initialize IPA to Shavian phonetic mapping."""
        # IPA to Shavian mapping based on standard English pronunciation
        self.ipa_to_shavian = {
            # Vowels
            'i': '𐑦', 'ɪ': '𐑦', 'iː': '𐑰', 'e': '𐑧', 'eɪ': '𐑱', 'ɛ': '𐑧', 'æ': '𐑨',
            'ɑ': '𐑭', 'ɑː': '𐑭', 'ɒ': '𐑪', 'ɔː': '𐑷', 'oʊ': '𐑴', 'ʊ': '𐑫', 'uː': '𐑵',
            'ʌ': '𐑳', 'ɜː': '𐑻', 'ə': '𐑩', 'ɚ': '𐑼', 'aɪ': '𐑲', 'aʊ': '𐑬', 'ɔɪ': '𐑶',
            'ɪə': '𐑽', 'eə': '𐑺', 'ʊə': '𐑻',
            
            # Consonants
            'p': '𐑐', 'b': '𐑚', 't': '𐑑', 'd': '𐑛', 'k': '𐑒', 'g': '𐑜', 'f': '𐑓',
            'v': '𐑝', 'θ': '𐑔', 'ð': '𐑞', 's': '𐑕', 'z': '𐑟', 'ʃ': '𐑖', 'ʒ': '𐑠',
            'tʃ': '𐑗', 'dʒ': '𐑡', 'm': '𐑥', 'n': '𐑯', 'ŋ': '𐑙', 'l': '𐑤', 'r': '𐑮',
            'w': '𐑢', 'j': '𐑘', 'h': '𐑣',
            
            # Additional mappings for common variations
            'x': '𐑒',  # Scottish 'ch' as in 'loch'
            'ʔ': '',    # Glottal stop (often silent)
        }
        
        # Common English letter combinations to IPA patterns
        self.letter_to_ipa_patterns = {
            # Vowel patterns (simplified - will be handled contextually)
            'a': ['æ'],      # Default to 'cat' sound
            'e': ['e'],      # Default to 'bed' sound  
            'i': ['ɪ'],      # Default to 'bit' sound
            'o': ['ɒ'],      # Default to 'lot' sound
            'u': ['ʊ'],      # Default to 'put' sound
            'y': ['j'],      # Default to consonant 'y'
            
            # Consonant patterns
            'b': ['b'],
            'd': ['d'],
            'f': ['f'],
            'h': ['h'],
            'j': ['dʒ'],
            'k': ['k'],
            'l': ['l'],
            'm': ['m'],
            'n': ['n'],
            'p': ['p'],
            'q': ['k'],
            'r': ['r'],
            't': ['t'],
            'v': ['v'],
            'w': ['w'],
            'x': ['ks'],
            'z': ['z'],
        }
        
    def _get_ipa_from_text(self, word: str) -> str:
        """Convert English text to IPA using phonetic rules."""
        word = word.lower()
        ipa = ""
        i = 0
        
        while i < len(word):
            char = word[i]
            
            # Handle common trigraphs first
            if i < len(word) - 2:
                trigraph = word[i:i+3]
                if trigraph in ['tch', 'dge']:
                    if trigraph == 'tch':
                        ipa += 'tʃ'
                    elif trigraph == 'dge':
                        ipa += 'dʒ'
                    i += 3
                    continue
            
            # Handle common digraphs
            if i < len(word) - 1:
                digraph = word[i:i+2]
                if digraph in ['th', 'ch', 'sh', 'ph', 'wh', 'qu', 'ng', 'ck', 'gh']:
                    if digraph == 'th':
                        # Context-dependent: voiced in function words, unvoiced in content words
                        if word in ['the', 'this', 'that', 'these', 'those', 'they', 'them', 'their']:
                            ipa += 'ð'
                        else:
                            ipa += 'θ'
                    elif digraph == 'ch':
                        ipa += 'tʃ'
                    elif digraph == 'sh':
                        ipa += 'ʃ'
                    elif digraph == 'ph':
                        ipa += 'f'
                    elif digraph == 'wh':
                        ipa += 'w'
                    elif digraph == 'qu':
                        ipa += 'kw'
                    elif digraph == 'ng':
                        ipa += 'ŋ'
                    elif digraph == 'ck':
                        ipa += 'k'
                    elif digraph == 'gh':
                        # 'gh' is often silent or 'f' in some words
                        if i > 0 and word[i-1] in ['au', 'ou']:
                            ipa += 'f'
                        else:
                            # Silent in most cases
                            pass
                    i += 2
                    continue
            
            # Handle single characters with context
            if char == 'c':
                # 'c' before 'e', 'i', 'y' is 's', otherwise 'k'
                if i < len(word) - 1 and word[i+1] in ['e', 'i', 'y']:
                    ipa += 's'
                else:
                    ipa += 'k'
            elif char == 'g':
                # 'g' before 'e', 'i', 'y' is 'dʒ', otherwise 'g'
                if i < len(word) - 1 and word[i+1] in ['e', 'i', 'y']:
                    ipa += 'dʒ'
                else:
                    ipa += 'g'
            elif char == 's':
                # 's' between vowels is often 'z'
                if i > 0 and i < len(word) - 1 and word[i-1] in 'aeiou' and word[i+1] in 'aeiou':
                    ipa += 'z'
                else:
                    ipa += 's'
            elif char in 'aeiou':
                # Handle vowels with context
                if char == 'a':
                    # 'a' patterns: cat, face, father, about
                    if i < len(word) - 1 and word[i+1] == 'e' and (i == len(word) - 2 or word[i+2] not in 'aeiou'):
                        ipa += 'eɪ'  # face
                    elif i < len(word) - 1 and word[i+1] in 'r':
                        ipa += 'ɑː'  # father
                    else:
                        ipa += 'æ'   # cat
                elif char == 'e':
                    # 'e' patterns: bed, me, pretty
                    if i == len(word) - 1:
                        ipa += 'iː'  # me (final e)
                    elif i < len(word) - 1 and word[i+1] in 'aeiou':
                        ipa += 'iː'  # me
                    else:
                        ipa += 'e'   # bed
                elif char == 'i':
                    # 'i' patterns: bit, bite, machine
                    if i < len(word) - 1 and word[i+1] == 'e' and (i == len(word) - 2 or word[i+2] not in 'aeiou'):
                        ipa += 'aɪ'  # bite
                    elif i == len(word) - 1:
                        ipa += 'iː'  # machine (final i)
                    else:
                        ipa += 'ɪ'   # bit
                elif char == 'o':
                    # 'o' patterns: lot, go, love
                    if i < len(word) - 1 and word[i+1] == 'e' and (i == len(word) - 2 or word[i+2] not in 'aeiou'):
                        ipa += 'oʊ'  # go
                    elif i < len(word) - 1 and word[i+1] in 'u':
                        ipa += 'ʌ'   # love
                    else:
                        ipa += 'ɒ'   # lot
                elif char == 'u':
                    # 'u' patterns: put, cute, rule
                    if i < len(word) - 1 and word[i+1] == 'e' and (i == len(word) - 2 or word[i+2] not in 'aeiou'):
                        ipa += 'juː' # cute
                    elif i < len(word) - 1 and word[i+1] in 'r':
                        ipa += 'uː'  # rule
                    else:
                        ipa += 'ʊ'   # put
            elif char == 'y':
                # 'y' patterns: yes, my, happy
                if i == 0 or (i > 0 and word[i-1] not in 'aeiou'):
                    ipa += 'j'   # yes (consonant)
                elif i == len(word) - 1:
                    ipa += 'iː'  # happy (final y)
                else:
                    ipa += 'ɪ'   # myth
            elif char in self.letter_to_ipa_patterns:
                # Use the first pattern as default
                ipa += self.letter_to_ipa_patterns[char][0]
            else:
                # Keep unknown characters as-is
                ipa += char
            
            i += 1
        
        return ipa
    
    def _ipa_to_shavian(self, ipa: str) -> str:
        """Convert IPA to Shavian script."""
        shavian = ""
        i = 0
        
        while i < len(ipa):
            # Try digraphs first
            if i < len(ipa) - 1:
                digraph = ipa[i:i+2]
                if digraph in self.ipa_to_shavian:
                    shavian += self.ipa_to_shavian[digraph]
                    i += 2
                    continue
            
            # Try single characters
            char = ipa[i]
            if char in self.ipa_to_shavian:
                shavian += self.ipa_to_shavian[char]
            else:
                # Keep unknown IPA symbols as-is
                shavian += char
            
            i += 1
        
        return shavian
    
    def _phonetic_transliterate(self, word: str) -> str:
        """Convert a word to Shavian using phonetic rules."""
        # Convert to IPA first
        ipa = self._get_ipa_from_text(word)
        
        # Convert IPA to Shavian
        shavian = self._ipa_to_shavian(ipa)
        
        # Add dot for proper nouns (words starting with uppercase)
        prefix = "·" if word[0].isupper() else ""
        
        # Add phonetic warning symbol
        return prefix + shavian + "[p]"

    def _initialize_spacy(self):
        """Initialize spaCy model and custom tokenizer."""
        # Load spaCy, excluding pipeline components that are not required
        self.nlp = spacy.load("en_core_web_sm", exclude=["parser", "lemmatizer", "textcat"])

        # Customise the spaCy tokeniser to ensure that initial and final dashes and dashes between words aren't stuck to one
        # of the surrounding words
        # Prefixes
        spacy_prefixes: list[str] = self.nlp.Defaults.prefixes + [r'''^[-–—]+''',]
        prefix_regex = compile_prefix_regex(spacy_prefixes)
        self.nlp.tokenizer.prefix_search = prefix_regex.search
        # Infixes
        spacy_infixes: list[str] = self.nlp.Defaults.infixes + [r'''[.,?!:;\-–—"~\(\)\[\]]+''',]
        infix_regex = compile_infix_regex(spacy_infixes)
        self.nlp.tokenizer.infix_finditer = infix_regex.finditer
        # Suffixes
        spacy_suffixes: list[str] = self.nlp.Defaults.suffixes + [r'''[-–—]+$''',]
        suffix_regex = compile_suffix_regex(spacy_suffixes)
        self.nlp.tokenizer.suffix_search = suffix_regex.search

        # Initialize phrase matcher
        self._initialize_phrase_matcher()
        
    def _initialize_phrase_matcher(self):
        """Initialize the phrase matcher with phrases from the phrases file."""
        def add_span(matcher, doc, i, matches):
            match_id, start, end = matches[i]

        # Define the phrase to match
        with open(self.phrases_path, "r", newline="") as f:
            reader = csv.reader(f)
            phrases = [row[0] for row in reader if row]
        phrase_patterns: list[Doc] = [self.nlp.make_doc(phrase) for phrase in phrases]
        self.phrase_matcher = PhraseMatcher(self.nlp.vocab, attr="LOWER")
        self.phrase_matcher.add("phrases", phrase_patterns, on_match=add_span)

    def tokenise(self, text: str) -> spacy.tokens.Doc:
        """Tokenise and tag the text using spaCy as doc."""
        doc = self.nlp(text)
        phrase_matches = self.phrase_matcher(doc)
        phrase_spans: list[Span] = []
        for match_id, start, end in phrase_matches:
            span = Span(doc, start, end, label=match_id)
            phrase_spans.append(span)

        filtered_spans = filter_spans(phrase_spans)

        with doc.retokenize() as retokenizer:
            for span in filtered_spans:
                retokenizer.merge(span)

        # Expand person entities to include titles and take initial 'the' out of entity names
        titles: set[str] = {
            "archbishop", "archdeacon", "baron", "baroness", "bishop", "captain", "count", "countess",
            "cpt", "dame", "deacon", "doctor", "dr.", "dr", "duchess", "duke", "earl", "emperor",
            "empress", "gov.", "gov", "governor", "justice", "king", "lady", "lord", "marchioness",
            "marquess", "marquis", "miss", "missus", "mister", "mistress", "mr.", "mr", "mrs.", "mrs",
            "ms.", "ms", "mx.", "mx", "pope", "pres.", "pres", "president", "prince", "princess",
            "prof.", "prof", "professor", "queen", "rev.", "rev", "reverend", "saint", "sen.", "sen",
            "senator", "sir", "st.", "st", "viscount", "viscountess"
        }
        new_ents: list[Span] = []
        for ent in doc.ents:
            # Only check for title if it's a person and not the first token
            if ent.label_ == "PERSON" and ent.start != 0:
                prev_token = doc[ent.start - 1]
                if prev_token.lower_ in titles:
                    new_ent = Span(doc, ent.start - 1, ent.end, label=ent.label)
                    new_ents.append(new_ent)
                else:
                    new_ents.append(ent)
            elif ent.label_ in self.namer_dot_ents:
                if doc[ent.start].lower_ == "the":
                    new_ent = Span(doc, ent.start + 1, ent.end, label=ent.label)
                    new_ents.append(new_ent)
                else:
                    new_ents.append(ent)
            else:
                new_ents.append(ent)

        filtered_ents = filter_spans(new_ents)
        doc.ents = tuple(filtered_ents)

        return doc

    def convert(self, doc: spacy.tokens.Doc) -> str:
        """Apply a series of tests to each token to determine how to Shavianise it."""
        text_split_shaw: str = ""

        for token in doc:
            # Leave HTML tags unchanged
            if token.tag_ == "HTML":
                text_split_shaw += token.text

            # Convert contractions
            elif token.lower_ in self.contraction_start and token.i < len(doc) - 1 and doc[token.i + 1].lower_ in self.contraction_end:
                text_split_shaw += self.contraction_start[token.lower_]
            elif token.lower_ in self.contraction_end:
                prefix: str = "𐑩" if token.lower_ != "𐑼" and text_split_shaw and text_split_shaw[-1] in self.consonants else ""
                text_split_shaw += prefix + self.contraction_end[token.lower_] + token.whitespace_

            # Convert possessive 's
            elif token.lower_ == "'s":
                suffix: str = "𐑕" if text_split_shaw[-1] in self.s_follows else "𐑩𐑟" if text_split_shaw[-1] in self.uhz_follows else "𐑟"
                text_split_shaw += suffix + token.whitespace_

            # Convert possessive '
            elif token.lower_ == "'" and token.tag_ == "POS":
                text_split_shaw += token.whitespace_

            # Convert verbs that change pronunciation before 'to', e.g. 'have to', 'used to', 'supposed to'
            elif token.lower_ in self.before_to and token.i < len(doc) - 1 and doc[token.i + 1].lower_ == "to":
                # 'have' only changes pronunciation where 'have to' means 'must'
                if token.lower_ in self.have_to and doc[token.i + 2].tag_ in ["VB", "VBP"]:
                    text_split_shaw += self.have_to[token.lower_] + token.whitespace_
                # 'used', 'supposed' etc. only change pronunciation in the past tense, not past participle
                elif token.lower_ in self.vbd_to and token.tag_ in ["VBD", "VBN", "."]:
                    text_split_shaw += self.vbd_to[token.lower_] + token.whitespace_

            # Match ordinal numbers represented by a numeral and a suffix
            elif re.fullmatch(r"([0-9]+(?:[, .]?[0-9]+)*)(st|nd|rd|th|s)", token.lower_):
                number, number_suffix = re.match(r"([0-9]+(?:[, .]?[0-9]+)*)(st|nd|rd|th|s)", token.lower_).groups()
                text_split_shaw += number + self.ordinal_suffixes[number_suffix] + token.whitespace_

            # Loop through the words in the ReadLex and look for matches, and only apply the namer dot to the first word
            # in a name (or not at all for initialisms marked with ⸰)
            elif token.lower_ in self.readlex_dict:
                for i in self.readlex_dict.get(token.lower_, []):
                    # Match the part of speech for heteronyms
                    if i["tag"] == token.tag_:
                        prefix: str = "·" if token.ent_iob_ == "B" and token.ent_type_ in self.namer_dot_ents and not i["Shaw"].startswith("⸰") else ""
                        text_split_shaw += prefix + i["Shaw"] + token.whitespace_
                        break

                    # For any proper nouns not in the ReadLex, match if an identical common noun exists
                    elif (i["tag"] in ["NN", "0"] and token.tag_ == "NNP") or (i["tag"] in ["NNS", "0"] and token.tag_ == "NNPS"):
                        prefix = "·" if token.ent_iob_ == "B" and token.ent_type_ in self.namer_dot_ents and not i["Shaw"].startswith("⸰") else ""
                        text_split_shaw += prefix + i["Shaw"] + token.whitespace_
                        break

                    # Match words with only one pronunciation
                    elif i["tag"] == "0":
                        prefix = "·" if token.ent_iob_ == "B" and token.ent_type_ in self.namer_dot_ents and not i["Shaw"].startswith("⸰") else ""
                        text_split_shaw += prefix + i["Shaw"] + token.whitespace_
                        break

            # Apply additional tests where there is still no match
            else:
                found: bool = False
                constructed_warning: str = "[c]"
                '''
                Try to construct a match using common prefixes and suffixes and include a warning symbol to aid proof
                reading
                '''
                for j in self.affixes:
                    if token.lower_.startswith(j) and j in self.prefixes:
                        prefix: str = self.prefixes[j]
                        suffix: str = ""
                        target_word: str = token.lower_[len(j):]
                    elif token.lower_.endswith(j) and j in self.suffixes:
                        prefix = ""
                        suffix = self.suffixes[j]
                        target_word = token.lower_[:-len(j)]
                    else:
                        continue
                    if target_word in self.readlex_dict:
                        found = True
                        for i in self.readlex_dict.get(target_word):
                            prefix = "·" if token.ent_iob_ == "B" and token.ent_type_ in self.namer_dot_ents and not i["Shaw"].startswith("⸰") else prefix
                            text_split_shaw += prefix + i["Shaw"] + suffix + constructed_warning + token.whitespace_
                            break

                # Try to construct plurals if not expressly included in the ReadLex, e.g. plurals of proper names.
                if token.lower_.endswith("s"):
                    target_word = token.lower_[:-1]
                    if target_word in self.readlex_dict:
                        found = True
                        for i in self.readlex_dict.get(target_word):
                            suffix = "𐑕" if i["Shaw"][-1] in self.s_follows else "𐑩𐑟" if i["Shaw"][-1] in self.uhz_follows else "𐑟"
                            prefix = "·" if token.ent_iob_ == "B" and token.ent_type_ in self.namer_dot_ents and not i["Shaw"].startswith("⸰") else ""
                            text_split_shaw += prefix + i["Shaw"] + suffix + constructed_warning + token.whitespace_
                            break

                if found is not False:
                    continue
                
                # Phonetic fallback: if no match found, try phonetic transliteration
                if token.text.isalpha():
                    phonetic_result = self._phonetic_transliterate(token.text)
                    text_split_shaw += phonetic_result + token.whitespace_
                else:
                    text_split_shaw += token.text + token.whitespace_

        return text_split_shaw

    def convert_text(self, text: str) -> str:
        """Convert Latin text to Shavian script."""
        # Create the string that will contain the Shavianised text.
        text_shaw: str = ""

        # Split up the string to reduce the risk of spaCy exceeding memory limits
        if text.strip().casefold().startswith("<!doctype html"):
            style_pattern: str = r"(<style\b[^>]*>.*?</style>)"
            script_pattern: str = r"(<script\b[^>]*>.*?</script>)"
            html_pattern: str = r"(?!(?:<style[^>]*?>.*?</style>|<script[^>]*?>.*?</script>))(<.*?>)"
            html_patterns: str = f"{style_pattern}|{script_pattern}|{html_pattern}"
            text_split: list[str] = re.split(html_patterns, text, flags=re.DOTALL)
            for text_part in text_split:
                if text_part is None:
                    pass
                elif re.fullmatch(style_pattern, text_part, flags=re.DOTALL) or re.fullmatch(
                        script_pattern, text_part, flags=re.DOTALL) or re.fullmatch(html_pattern, text_part, flags=re.DOTALL):
                    text_shaw += text_part
                else:
                    doc: spacy.tokens.Doc = self.tokenise(text_part)
                    text_shaw += self.convert(doc)

            # Convert dumb quotes, double hyphens, etc. to their typographic equivalents
            text_shaw = smartypants.smartypants(text_shaw)
            # Convert curly quotes to angle quotes
            quotation_marks: dict[str, str] = {"&#8216;": "&lsaquo;", "&#8217;": "&rsaquo;", "&#8220;": "&laquo;", "&#8221;": "&raquo;"}
            for key, value in quotation_marks.items():
                text_shaw = text_shaw.replace(key, value)

        else:
            text = unidecode.unidecode(text)
            text = re.sub(r"(\S)(\[)", r"\1 \2", text)
            text = re.sub(r"](\S)", r"] \1", text)
            text_split: list[str] = text.splitlines()
            for i in text_split:
                if len(i) < 10000:
                    doc: spacy.tokens.Doc = self.tokenise(i)
                    text_shaw += self.convert(doc) + "\n"
            # Convert dumb quotes, double hyphens, etc. to their typographic equivalents
            text_shaw = smartypants.smartypants(text_shaw)
            quotation_marks: dict[str, str] = {"&#8216;": "&lsaquo;", "&#8217;": "&rsaquo;", "&#8220;": "&laquo;", "&#8221;": "&raquo;"}
            for key, value in quotation_marks.items():
                text_shaw = text_shaw.replace(key, value)
            text_shaw = str(BeautifulSoup(text_shaw, features="html.parser"))

        return text_shaw

    def run_stdin_stdout_mode(self):
        """Run in stdin/stdout mode for long-running processes."""
        import sys
        import traceback
        
        print("READY", file=sys.stderr, flush=True)  # Signal that we're ready
        
        try:
            while True:
                try:
                    # Read a line from stdin
                    line = sys.stdin.readline()
                    if not line:  # EOF
                        break
                    
                    line = line.rstrip('\n')
                    # Parse the request format: "ID:TEXT"
                    colon_index = line.find(':')
                    if colon_index == -1:
                        continue  # Skip malformed requests
                    
                    request_id = line[:colon_index]
                    text = line[colon_index + 1:]
                    
                    # If text is empty or whitespace, just return empty string
                    if not text.strip():
                        print(f"{request_id}:", flush=True)
                        continue
                    
                    try:
                        result = self.convert_text(text)
                        print(f"{request_id}:{result}", flush=True)
                    except Exception as e:
                        print(f"Error: {e}", file=sys.stderr, flush=True)
                        print(f"{request_id}:", flush=True)
                except Exception as e:
                    print(f"Exception: {e}", file=sys.stderr, flush=True)
                    traceback.print_exc(file=sys.stderr)
        except KeyboardInterrupt:
            pass


def latin2shaw(text):
    """Legacy function for backward compatibility."""
    converter = LatinToShavian()
    return converter.convert_text(text)


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Convert Latin text to Shavian script")
    parser.add_argument("--stdin-stdout", action="store_true", 
                       help="Run in stdin/stdout mode for long-running processes")
    parser.add_argument("--text", type=str, help="Text to convert (if not using stdin/stdout mode)")
    parser.add_argument("--readlex-path", type=str, default="readlex/readlex_converter.json",
                       help="Path to ReadLex converter JSON file")
    parser.add_argument("--phrases-path", type=str, default="readlex/readlex_converter_phrases.json",
                       help="Path to phrases JSON file")
    
    args = parser.parse_args()
    
    converter = LatinToShavian(args.readlex_path, args.phrases_path)
    
    if args.stdin_stdout:
        # Run in stdin/stdout mode
        converter.run_stdin_stdout_mode()
    elif args.text:
        # Convert provided text
        result = converter.convert_text(args.text)
        print(result)
    else:
        # Read from stdin if no text provided
        text = sys.stdin.read()
        result = converter.convert_text(text)
        print(result)