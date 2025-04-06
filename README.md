# Japanese Learning Toolkit

A personal web-based Japanese learning toolkit that visualizes sentences with furigana and provides kanji word lists for pronunciation and meaning practice. Built with SvelteKit and SQLite.

## Features

- **Sentence Management**: Add, view, edit, and delete Japanese sentences with their translations
- **Furigana Visualization**: Display sentences with furigana annotations for easier reading
- **Kanji Library**: Track kanji you've encountered and review their details
- **Vocabulary Building**: Automatically extract vocabulary from sentences 
- **Study Lists**: Create custom lists of sentences, vocabulary, and kanji for targeted practice
- **Progress Tracking**: Monitor your familiarity with specific items

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Styling**: Custom CSS (no external framework)

## Getting Started

### Prerequisites

- Node.js (v16 or newer)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd japanese-learning-toolkit
```

2. Install dependencies
```bash
npm install
```

3. Generate database migrations
```bash
npm run db:generate
```

4. Run database migrations
```bash
npm run db:migrate
```

5. Start development server
```bash
npm run dev
```

6. Visit [http://localhost:5173](http://localhost:5173) in your browser

## Database Schema

The project uses the following database schema:

- **kanji**: Stores information about individual kanji characters
- **vocabulary**: Records Japanese words with their readings and meanings
- **word_kanji_mapping**: Links vocabulary to constituent kanji
- **sentences**: Contains Japanese sentences with translations and furigana data
- **word_instances**: Tracks word occurrences within sentences
- **progress**: Monitors user familiarity with items
- **study_lists** and **list_items**: Organize learning materials
- **furigana_cache**: Caches furigana readings for efficiency

## Usage

### Adding Sentences

1. Navigate to the Sentences page
2. Click "Add New Sentence"
3. Enter the Japanese text, translation, and other details
4. Click "Add Sentence"

### Viewing Sentences with Furigana

1. Open any sentence from the Sentences list
2. The Japanese text will be displayed with furigana annotations if available
3. Use the "Generate Furigana" button to process a sentence without furigana

### Creating Study Lists

1. Go to the Study Lists page
2. Click "Create New List"
3. Name your list and add a description
4. Add sentences, vocabulary, or kanji to your list

## Future Enhancements

- Integration with external Japanese dictionaries
- Spaced repetition review system
- Export/import functionality
- Mobile application

## License

This project is licensed under the MIT License - see the LICENSE file for details.
