# Website Information Extractor

A powerful Node.js application that extracts comprehensive information from websites, including text content, media files, and linked pages. Built with Puppeteer for handling both static and dynamic websites.

## Features

- Extracts text content from web pages
- Captures media content (images, videos) with metadata
- Recursively crawls linked pages within the same domain
- Handles dynamic content rendered by JavaScript
- Outputs structured JSON data
- Domain-restricted crawling

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone git@github.com:venu-prasath/crawlerX.git
cd website-extractor
```

2. Install dependencies:
```bash
npm install
```

## Usage

Run the application with a URL as an argument:

```bash
node main.js https://example.com
```

The extracted information will be saved to `output.json` in the project root directory.

## Output Format

The application generates a structured JSON file containing:

```json
{
  "url": "https://example.com/page",
  "text": "The visible text on the page...",
  "media": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg",
      "alt": "Description",
      "width": 800,
      "height": 600
    },
    {
      "type": "video",
      "url": "https://example.com/video.mp4"
    }
  ],
  "links": [
    "https://example.com/page2",
    "https://example.com/page3"
  ],
  "error": null
}
```

## Project Structure

```
/project-root
├── main.js          # Entry point
├── crawler.js       # Crawling logic
├── extractor.js     # Data extraction
├── utils.js         # Utility functions
├── package.json     # Dependencies
└── output.json      # Generated output
```

## Technical Details

- Uses Puppeteer for headless browser automation
- Processes up to 5 URLs concurrently
- Handles both HTML and non-HTML resources
- Normalizes URLs and restricts crawling to the same domain
- Waits for network idle before extracting content

## Limitations

- Limited to same-domain crawling
- Maximum of 5 concurrent page processing
- Basic media metadata extraction
- No built-in rate limiting
- No persistence for large websites

## Future Enhancements

- [ ] Add maximum depth/page limits
- [ ] Implement database persistence
- [ ] Enhanced media metadata extraction
- [ ] Support for iframes and non-HTML content
- [ ] Retry logic for failed requests
- [ ] Configurable delays

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Puppeteer](https://pptr.dev/)
- Inspired by web scraping and data extraction needs 
