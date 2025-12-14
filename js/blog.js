document.addEventListener('DOMContentLoaded', () => {
    /* -------- Blog: fetch RSS and render posts as cards (moved to separate file) -------- */
    /* -------- Blog: fetch Tumblr JS and render posts as cards -------- */
    const TUMBLR_JS_URL = 'https://t.nico-ruge.de/js';
    const POSTS_PER_PAGE = 5;
    let blogPosts = [];
    let blogPage = 0;

    const $blogList = document.getElementById('blog-list');
    const $blogPrev = document.getElementById('blog-prev');
    const $blogNext = document.getElementById('blog-next');
    const $blogPrevBottom = document.getElementById('blog-prev-bottom');
    const $blogNextBottom = document.getElementById('blog-next-bottom');
    const $pageIndicator = document.getElementById('blog-page-indicator');
    const $pageIndicatorBottom = document.getElementById('blog-page-indicator-bottom');

    /**
     * Loads the Tumblr JS script by intercepting document.write.
     * This allows us to capture the HTML it generates and parse it,
     * so we can render it with our own "Card" design.
     */
    function loadTumblrJs() {
        if (!$blogList) return;
        $blogList.innerHTML = '<div class="sp-card">Loading posts…</div>';

        // 1. Capture document.write
        const oldWrite = document.write;
        let capturedHTML = '';

        document.write = (content) => {
            capturedHTML += content;
        };

        // 2. Load the script
        const script = document.createElement('script');
        script.src = TUMBLR_JS_URL;
        script.onload = () => {
            // Restore document.write
            document.write = oldWrite;
            // Parse captured output
            try {
                blogPosts = parseTumblrHTML(capturedHTML);
                blogPage = 0;
                renderBlogPage(blogPage);
            } catch (e) {
                console.error('Error parsing Tumblr output:', e);
                $blogList.innerHTML = '<div class="sp-card">Fehler beim Laden des Blogs.</div>';
            }
        };
        script.onerror = (e) => {
            document.write = oldWrite;
            console.error('Error loading Tumblr script:', e);
            $blogList.innerHTML = '<div class="sp-card">Fehler beim Laden des Blogs (Network).</div>';
        };

        document.body.appendChild(script);
    }

    /**
     * Parses the HTML string output by Tumblr's JS into a list of post objects.
     */
    function parseTumblrHTML(htmlString) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        // The script outputs an <ol class="tumblr_posts"> ... </ol>
        const items = Array.from(doc.querySelectorAll('li.tumblr_post'));

        return items.map(li => {
            const titleEl = li.querySelector('.tumblr_title');
            const bodyEl = li.querySelector('.tumblr_body');

            let link = 'https://t.nico-ruge.de';
            const firstAnchor = bodyEl ? bodyEl.querySelector('a') : null;
            if (firstAnchor) link = firstAnchor.href;

            const title = titleEl ? titleEl.textContent : (bodyEl ? bodyEl.textContent.substring(0, 50) + '...' : 'Post');

            let imgs = [];
            let content = '';
            let tags = [];

            if (bodyEl) {
                // Clone body to manipulate it
                const bodyClone = bodyEl.cloneNode(true);

                // 1. Extract Images
                const images = Array.from(bodyClone.querySelectorAll('img'));
                imgs = images.map(img => img.src);

                images.forEach(img => {
                    const fig = img.closest('figure');
                    if (fig) fig.remove();
                    else img.remove();
                });

                // 2. Extract Tags (Hashtags)
                // We'll look for text/links that are hashtags.
                // Tumblr often links hashtags like <a href="...">#tag</a> or just text #tag
                // Regex for #tag not surrounded by other letters
                const tagRegex = /#\w+/g;

                // Walker to find text nodes and extract tags
                const walker = document.createTreeWalker(bodyClone, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while (node = walker.nextNode()) {
                    const text = node.nodeValue;
                    const matches = text.match(tagRegex);
                    if (matches) {
                        matches.forEach(m => {
                            // add to tags buffer (remove # for cleaner display if desired, or keep it)
                            tags.push(m);
                        });
                        // Remove tag from text? 
                        // Often nicer to remove them if we display them in footer.
                        node.nodeValue = text.replace(tagRegex, '').trim();
                    }
                }

                // 3. Cleanup empty containers (npf_row/col)
                const structuralDivs = bodyClone.querySelectorAll('.npf_row, .npf_col, .tmblr-full');
                structuralDivs.forEach(div => {
                    if (!div.textContent.trim() && !div.querySelector('img, video, iframe')) {
                        div.remove();
                    }
                });

                // 4. Cleanup trailing breaks or empty paragraphs
                // (Simple pass)
                content = bodyClone.innerHTML;
            }

            const pubDate = '';

            return { title, link, pubDate, content, imgs, tags };
        });
    }

    function renderBlogPage(page) {
        if (!$blogList) return;
        const totalPages = Math.max(1, Math.ceil(blogPosts.length / POSTS_PER_PAGE));
        blogPage = Math.max(0, Math.min(page, totalPages - 1));
        const start = blogPage * POSTS_PER_PAGE;
        const slice = blogPosts.slice(start, start + POSTS_PER_PAGE);

        $blogList.innerHTML = '';
        if (slice.length === 0) {
            $blogList.innerHTML = '<div class="sp-card">Keine Posts gefunden.</div>';
        }

        slice.forEach(post => {
            const card = document.createElement('article');
            card.className = 'blog-card';

            // meta row: title left (link), date right
            const meta = document.createElement('div'); meta.className = 'meta-row';
            const title = document.createElement('a'); title.className = 'post-title';
            title.href = post.link; title.target = '_blank'; title.rel = 'noopener';
            title.innerHTML = post.title || '(no title)'; // innerHTML to preserve partial HTML if any

            // Only add date if we have one
            if (post.pubDate) {
                const date = document.createElement('div'); date.className = 'post-date';
                date.innerText = new Date(post.pubDate).toLocaleString();
                meta.appendChild(title); meta.appendChild(date);
            } else {
                meta.appendChild(title);
            }
            card.appendChild(meta);

            // images (displayed before content)
            if (post.imgs && post.imgs.length) {
                if (post.imgs.length === 1) {
                    const img = document.createElement('img');
                    img.className = 'post-feature';
                    img.src = post.imgs[0];
                    card.appendChild(img);
                } else {
                    const imagesWrap = document.createElement('div');
                    imagesWrap.className = 'post-images multi';
                    const cols = Math.ceil(post.imgs.length / 2);
                    imagesWrap.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
                    post.imgs.forEach(src => {
                        const img = document.createElement('img');
                        img.className = 'post-feature';
                        img.src = src;
                        imagesWrap.appendChild(img);
                    });
                    card.appendChild(imagesWrap);
                }
            }

            // content
            const content = document.createElement('div');
            content.className = 'post-content';
            content.innerHTML = post.content || '';
            card.appendChild(content);

            // tags
            if (post.tags && post.tags.length) {
                const tagwrap = document.createElement('div'); tagwrap.className = 'blog-tags';
                post.tags.forEach(t => {
                    const span = document.createElement('div'); span.className = 'tag'; span.innerText = t;
                    tagwrap.appendChild(span);
                });
                card.appendChild(tagwrap);
            }

            $blogList.appendChild(card);
        });

        // update indicators and disable/enable buttons
        const displayPage = blogPage + 1;
        if ($pageIndicator) $pageIndicator.innerText = displayPage;
        if ($pageIndicatorBottom) $pageIndicatorBottom.innerText = displayPage;

        const $prevBtns = [$blogPrev, $blogPrevBottom];
        const $nextBtns = [$blogNext, $blogNextBottom];
        $prevBtns.forEach(b => { if (b) b.disabled = (blogPage === 0); });
        $nextBtns.forEach(b => { if (b) b.disabled = (blogPage >= totalPages - 1); });
    }

    // wire up controls
    if ($blogPrev) $blogPrev.addEventListener('click', () => renderBlogPage(blogPage - 1));
    if ($blogNext) $blogNext.addEventListener('click', () => renderBlogPage(blogPage + 1));
    if ($blogPrevBottom) $blogPrevBottom.addEventListener('click', () => renderBlogPage(blogPage - 1));
    if ($blogNextBottom) $blogNextBottom.addEventListener('click', () => renderBlogPage(blogPage + 1));

    // Fetch posts via captured JS
    loadTumblrJs();
});
