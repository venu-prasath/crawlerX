async function extractData(page, url) {
    try {
        const response = await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        const contentType = response.headers()['content-type'] || '';
        const finalUrl = page.url();
        const timestamp = new Date().toISOString();

        if (!contentType.includes('text/html')) {
            return {
                url: finalUrl,
                type: contentType,
                timestamp,
                error: null
            };
        }

        const text = await page.evaluate(() => {
            const scripts = document.querySelectorAll('script, style');
            scripts.forEach(s => s.remove());
            return document.body.innerText.trim();
        });

        // const media = await page.evaluate(() => {
        //     const getMediaElements = () => {
        //         const images = Array.from(document.querySelectorAll('img')).map(img => ({
        //             type: 'image',
        //             url: img.src,
        //             alt: img.alt || '',
        //             title: img.title || '',
        //             width: img.naturalWidth || null,
        //             height: img.naturalHeight || null
        //         }));

        //         const videos = Array.from(document.querySelectorAll('video, video source')).map(video => ({
        //             type: 'video',
        //             url: video.src || video.currentSrc || '',
        //             title: video.title || '',
        //             width: video.videoWidth || null,
        //             height: video.videoHeight || null
        //         }));

        //         const audio = Array.from(document.querySelectorAll('audio, audio source')).map(audio => ({
        //             type: 'audio',
        //             url: audio.src || audio.currentSrc || '',
        //             title: audio.title || ''
        //         }));

        //         return [...images, ...videos, ...audio].filter(m => m.url);
        //     };

        //     return getMediaElements();
        // });

        const links = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('a[href]'))
                .map(a => a.href)
                .filter(href => href && !href.startsWith('javascript:'));
        });

        const codeSnippets = await page.evaluate(() => {
            const snippets = [];
            
            const codeElements = document.querySelectorAll('pre code, pre');
            codeElements.forEach((element, index) => {
                const language = element.className.match(/language-(\w+)/)?.[1] || 'text';
                snippets.push({
                    content: element.textContent.trim(),
                    language: language,
                    index: index
                });
            });

            const text = document.body.innerHTML;
            const markdownCodeBlocks = text.match(/```[\s\S]*?```/g) || [];
            markdownCodeBlocks.forEach((block, index) => {
                const content = block.replace(/```(\w*)\n?/, '').replace(/```$/, '').trim();
                const language = block.match(/```(\w*)/)?.[1] || 'text';
                if (content) {
                    snippets.push({
                        content: content,
                        language: language,
                        index: snippets.length + index
                    });
                }
            });

            return new Set(snippets);
        });

        const metadata = await page.evaluate(() => {
            const getMetaContent = (name) => {
                const element = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
                return element ? element.getAttribute('content') : null;
            };

            return {
                title: document.title,
                description: getMetaContent('description') || getMetaContent('og:description'),
                keywords: getMetaContent('keywords'),
                author: getMetaContent('author')
            };
        });

        // const absoluteMedia = media.map(m => ({
        //     ...m,
        //     url: new URL(m.url, finalUrl).href
        // }));

        const absoluteLinks = links.map(link => new URL(link, finalUrl).href);

        return {
            url: finalUrl,
            timestamp,
            metadata,
            text,
            // media: absoluteMedia,
            links: absoluteLinks,
            codeSnippets: codeSnippets.length > 0 ? codeSnippets : null,
            error: null
        };

    } catch (error) {
        return {
            url,
            timestamp: new Date().toISOString(),
            error: `Extraction failed: ${error.message}`
        };
    }
}

module.exports = { extractData };
