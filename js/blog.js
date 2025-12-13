document.addEventListener('DOMContentLoaded', () => {
    /* -------- Blog: fetch RSS and render posts as cards (moved to separate file) -------- */
    const BLOG_URL = 'https://t.nico-ruge.de';
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

    function parseRSS(xmlText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlText, 'application/xml');
        const items = Array.from(doc.querySelectorAll('item'));
        return items.map(item => {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || item.querySelector('guid')?.textContent || '#';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            let content = '';
            const contentEncoded = item.getElementsByTagName('content:encoded')[0];
            if (contentEncoded) content = contentEncoded.textContent;
            else if (item.querySelector('description')) content = item.querySelector('description').textContent;

            // extract images and remove them from content so images don't appear twice
            const tmp = document.createElement('div');
            tmp.innerHTML = content || '';
            const imgs = Array.from(tmp.querySelectorAll('img')).map(img => img.src);
            // remove image nodes from content
            tmp.querySelectorAll('img').forEach(n => n.remove());
            // Keep the remaining HTML as the post content
            const cleanedContent = tmp.innerHTML;

            const tags = Array.from(item.querySelectorAll('category')).map(c => c.textContent).filter(Boolean);

            return { title, link, pubDate, content: cleanedContent, imgs, tags };
        });
    }

    async function fetchBlogPosts() {
        if (!$blogList) return;
        $blogList.innerHTML = '<div class="sp-card">Loading posts…</div>';
        try {
            const res = await fetch(`${BLOG_URL}/rss`);
            if (!res.ok) throw new Error('Network response was not ok');
            const text = await res.text();
            blogPosts = parseRSS(text);
            blogPage = 0;
            renderBlogPage(blogPage);
        } catch (e) {
            $blogList.innerHTML = `<div class="sp-card">Fehler beim Laden des Feeds: ${e.message}</div>`;
            console.error('RSS fetch error', e);
        }
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
            title.innerText = post.title || '(no title)';
            const date = document.createElement('div'); date.className = 'post-date';
            date.innerText = post.pubDate ? new Date(post.pubDate).toLocaleString() : '';
            meta.appendChild(title); meta.appendChild(date);
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

            // content (cleaned HTML without the extracted images)
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

    // Fetch posts immediately so the Blog is ready
    fetchBlogPosts();
});
