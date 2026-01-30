# Media Embedding Guide

Learn how to embed various types of media in your MD Presenter presentations.

---

## 📹 Local Video Files

Use the `![video](path)` syntax for local video files:

```markdown
![video](videos/demo.mp4)
```

Example:
![video](https://www.w3schools.com/html/mov_bbb.mp4)

---

## 🎬 YouTube Videos

Use the `![youtube](url)` syntax for YouTube videos:

```markdown
![youtube](https://www.youtube.com/watch?v=VIDEO_ID)
![youtube](https://youtu.be/VIDEO_ID)
```

Example:
![youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)

---

## 🎥 Vimeo Videos

Use the `![vimeo](url)` syntax for Vimeo videos:

```markdown
![vimeo](https://vimeo.com/VIDEO_ID)
```

Example:
![vimeo](https://vimeo.com/76979871)

---

## 🎨 SVG Images

Use the `![svg](path)` syntax for SVG files:

```markdown
![svg](images/diagram.svg)
```

Or use regular image syntax:

```markdown
![Alt text](image.svg)
```

Example:
![svg](https://upload.wikimedia.org/wikipedia/commons/1/1a/SVG_example_markup_grid.svg)

---

## 📱 Instagram Posts

For Instagram embeds, paste the full embed code directly in your markdown:

```html
<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/POST_ID/">
  ...
</blockquote>
<script async src="//www.instagram.com/embed.js"></script>
```

To get the embed code:

1. Go to the Instagram post
2. Click the three dots menu (⋯)
3. Select "Embed"
4. Copy the embed code
5. Paste it directly in your markdown

---

## 🐦 Twitter/X Posts

For Twitter/X embeds, paste the embed code directly:

```html
<blockquote class="twitter-tweet">
  <p>Tweet content...</p>
  <a href="https://twitter.com/username/status/TWEET_ID">Link</a>
</blockquote>
<script async src="https://platform.twitter.com/widgets.js"></script>
```

To get the embed code:

1. Go to the tweet
2. Click the share button
3. Select "Embed Tweet"
4. Copy and paste the code

---

## 🎵 TikTok Videos

For TikTok embeds, use the embed code:

```html
<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@username/video/VIDEO_ID">
  ...
</blockquote>
<script async src="https://www.tiktok.com/embed.js"></script>
```

---

## 💻 CodePen Embeds

For CodePen demos, use the embed code:

```html
<p class="codepen" data-height="400" data-default-tab="result" data-user="username" data-slug-hash="PEN_ID">
  <span>See the Pen...</span>
</p>
<script async src="https://cpwebassets.codepen.io/assets/embed/ei.js"></script>
```

---

## 🖼️ Images with Custom Size

Control image sizing with attributes:

```markdown
![Alt text](image.jpg){width=50%}
![Alt text](image.png){width=300px}
```

Example:
![Small image](https://via.placeholder.com/600x400){width=50%}

---

## 🎯 Raw HTML Embeds

You can embed any HTML directly in your markdown:

```html
<div style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
            padding: 2rem; border-radius: 1rem; color: white;">
  <h3>Custom HTML Content</h3>
  <p>This is a custom HTML block with styling!</p>
</div>
```

<div style="background: linear-gradient(45deg, #667eea 0%, #764ba2 100%);
            padding: 2rem; border-radius: 1rem; color: white;">
  <h3>Custom HTML Content</h3>
  <p>This is a custom HTML block with styling!</p>
</div>

---

## 📊 iFrame Embeds

Embed any website or web app using iframes:

```html
<iframe src="https://example.com" width="100%" height="400" frameborder="0"></iframe>
```

Works great for:

- Google Maps
- Spotify playlists
- SoundCloud tracks
- GitHub Gists
- Any embeddable content

---

## 🎨 Multiple Media in One Slide

You can combine different media types:

![image](https://via.placeholder.com/300x200){width=40%}

Along with text and other content...

<div style="display: flex; gap: 1rem; margin-top: 1rem;">
  <div style="flex: 1; background: #f0f0f0; padding: 1rem; border-radius: 0.5rem;">
    <h4>Column 1</h4>
    <p>Content here</p>
  </div>
  <div style="flex: 1; background: #f0f0f0; padding: 1rem; border-radius: 0.5rem;">
    <h4>Column 2</h4>
    <p>More content</p>
  </div>
</div>

---

## 💡 Tips & Best Practices

### Performance

- **Optimize media files** - Compress images and videos
- **Use appropriate formats** - WebP for images, MP4 for videos
- **Lazy loading** - Large media loads when slide is shown

### Responsive Design

- Use **percentage widths** for images: `{width=80%}`
- **Video embeds** automatically scale to fit
- **Test on different screen sizes**

### Accessibility

- Always include **alt text** for images
- Provide **captions** for videos when possible
- Ensure **sufficient contrast** in custom HTML

---

## 🚀 Advanced Example

Here's a slide with multiple media types:

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; align-items: center;">
  <div>
    <h3>📝 Content Section</h3>
    <ul>
      <li>Point 1 with <strong>emphasis</strong></li>
      <li>Point 2 with <em>style</em></li>
      <li>Point 3 with <code>code</code></li>
    </ul>
  </div>
  <div>
    <img src="https://via.placeholder.com/400x300" style="width: 100%; border-radius: 0.5rem;">
  </div>
</div>

<div style="background: #f8f9fa; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem;">
  <p style="text-align: center; margin: 0;">
    <strong>Pro Tip:</strong> Combine markdown and HTML for maximum flexibility!
  </p>
</div>

---

## 📖 Summary

### Supported Media Types

- ✅ **Local videos** - `![video](path.mp4)`
- ✅ **YouTube** - `![youtube](youtube.com/watch?v=ID)`
- ✅ **Vimeo** - `![vimeo](vimeo.com/ID)`
- ✅ **SVG** - `![svg](image.svg)`
- ✅ **Images with sizing** - `![alt](img.jpg){width=50%}`
- ✅ **Instagram** - Paste embed code
- ✅ **Twitter/X** - Paste embed code
- ✅ **TikTok** - Paste embed code
- ✅ **Raw HTML** - Write HTML directly
- ✅ **iFrames** - Embed any website

### Remember

- The app preserves HTML in markdown
- Scripts are executed for dynamic embeds
- All embeds are responsive
- Media loads efficiently per slide

Happy presenting! 🎉
