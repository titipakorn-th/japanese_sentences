# Hybrid Furigana Generation System

This system combines multiple approaches to generate accurate furigana readings for Japanese text. It uses a multi-layered architecture to ensure high-quality readings while optimizing for performance.

## Architecture

The system is built around four main layers:

### 1. Local Dictionary Layer
- Prioritizes exact matches from the vocabulary database
- Uses cached furigana for previously processed words
- Implements confidence scoring to rank different sources

### 2. Morphological Analysis Layer
- Integrates with the Kuromoji Japanese morphological analyzer
- Segments text and identifies readings for common words
- Extracts base forms and conjugations of verbs and adjectives
- Stores successfully analyzed words in the vocabulary database

### 3. LLM Integration Layer
- Connects to OpenAI API for complex cases
- Sends unknown words or phrases to the LLM for furigana generation
- Uses optimized prompts to get accurate readings
- Stores LLM-generated furigana in the cache for future use
- Supports mock mode for testing without API costs

### 4. Learning and Correction System
- Provides UI for correcting inaccurate furigana
- Applies corrections to the furigana cache with high confidence
- Uses corrections to improve future processing
- Tracks confidence levels for different sources

## Key Components

### Database Models
- `vocabulary`: Stores words with their readings
- `furiganaCache`: Stores generated furigana with confidence scores
- `sentences`: Contains Japanese sentences with their furigana data

### Services
- `furigana-generator.ts`: Main orchestration service that coordinates the layers
- `morphological-analyzer.ts`: Service for Japanese text analysis using Kuromoji
- `llm-service.ts`: Service for connecting to LLM APIs
- `api-service.ts`: Client-side service for interacting with API endpoints

### UI Components
- `FuriganaEditor.svelte`: Component for displaying and editing furigana
- `/furigana-demo`: Demo page showcasing the system

## API Endpoints
- `POST /api/furigana/generate`: Generate furigana for text
- `POST /api/furigana/update`: Update furigana readings
- `POST /api/sentences/:id/furigana`: Apply furigana to a sentence

## Testing Features

### Mock Mode

The system includes a mock mode for testing without making actual API calls to OpenAI:

- Predefined responses for common Japanese phrases
- Enable by setting `useMockLLM: true` in API requests
- Useful for development, testing, and CI/CD environments
- No API keys or costs required when using mock mode

```typescript
// Using mock mode in API requests
const furigana = await generateFuriganaViaApi('日本語', true);
```

## Usage Examples

### Generating Furigana

```typescript
import { generateFurigana } from '$lib/services/furigana-generator';

// Generate furigana with LLM fallback
const furigana = await generateFurigana(
  '日本語を勉強しています', 
  'your-api-key'
);

// Generate furigana in mock mode (no API calls)
const furigana = await generateFurigana(
  '日本語を勉強しています', 
  'your-api-key',
  true
);
```

### Using the FuriganaEditor Component

```svelte
<script>
  import FuriganaEditor from '$lib/components/FuriganaEditor.svelte';
  import type { FuriganaItem } from '$lib/db/types';
  
  let furiganaItems: FuriganaItem[] = [...];
  
  function handleUpdate(updated: FuriganaItem[]) {
    furiganaItems = updated;
  }
</script>

<FuriganaEditor 
  sentenceText="日本語を勉強しています" 
  furiganaData={furiganaItems}
  onUpdate={handleUpdate}
/>
```

## Confidence Scoring

The system uses confidence scores to prioritize readings:

- `100`: Vocabulary database matches (highest confidence)
- `90-100`: User corrections
- `85`: LLM-generated readings
- `70`: Morphological analysis
- `50`: Lower confidence cached entries

## Environment Variables

To use the LLM integration, set this environment variable:

```
OPENAI_API_KEY=your-openai-api-key
``` 