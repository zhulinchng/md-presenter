"""Tests for the markdown parsing pipeline in app.py."""

from app import (
    extract_slide_title,
    parse_markdown_to_slides,
    process_media_links,
)


class TestExtractSlideTitle:
    def test_heading(self):
        assert extract_slide_title("## My Heading\n\nbody") == "My Heading"

    def test_fallback_first_line(self):
        assert extract_slide_title("plain first line") == "plain first line"

    def test_formatting_stripped(self):
        assert extract_slide_title("**bold** and *italic*") == "bold and italic"

    def test_link_text_extracted(self):
        assert extract_slide_title("[link text](http://x.com)") == "link text"

    def test_empty(self):
        assert extract_slide_title("") == "Untitled"

    def test_truncated_to_50_chars(self):
        long = "x" * 80
        result = extract_slide_title(long)
        assert len(result) == 53  # 50 + "..."


class TestParseMarkdownToSlides:
    def test_splits_on_separator(self):
        slides = parse_markdown_to_slides("# One\n\nfoo\n\n---\n\n# Two\n\nbar")
        assert len(slides) == 2
        assert slides[0]["title"] == "One"
        assert slides[1]["title"] == "Two"

    def test_crlf_line_endings_split(self):
        content = "# One\r\n\r\nfoo\r\n\r\n---\r\n\r\n# Two\r\n\r\nbar"
        slides = parse_markdown_to_slides(content)
        assert len(slides) == 2

    def test_empty_segments_skipped(self):
        slides = parse_markdown_to_slides("---\n\n# Only\n\n---")
        assert len(slides) == 1

    def test_notes_extracted_and_removed(self):
        content = "# Title\n\n<!-- notes -->whispered<!-- /notes -->\n\nvisible"
        slides = parse_markdown_to_slides(content)
        assert slides[0]["notes"] == "whispered"
        assert "whispered" not in slides[0]["html"]
        assert "visible" in slides[0]["html"]

    def test_mermaid_captured(self):
        content = "# Diagram\n\n```mermaid\ngraph TD; A-->B;\n```"
        slides = parse_markdown_to_slides(content)
        assert slides[0]["mermaid"] == "graph TD; A-->B;"

    def test_no_mermaid_is_none(self):
        slides = parse_markdown_to_slides("# Plain")
        assert slides[0]["mermaid"] is None

    def test_html_block_preserved_verbatim(self):
        block = (
            '<blockquote class="instagram-media" data-instgrm-permalink="x">'
            "<p>ig</p></blockquote>\n\n<script>console.log('ig');</script>"
        )
        slides = parse_markdown_to_slides("# Social\n\n" + block)
        assert block.split("\n\n<script")[0] in slides[0]["html"]
        assert "<script>console.log('ig');</script>" in slides[0]["html"]

    def test_scripts_preserved_in_scripts_list(self):
        content = '# Page\n\n<script src="https://x.com/w.js"></script>'
        slides = parse_markdown_to_slides(content)
        assert slides[0]["scripts"] == ['<script src="https://x.com/w.js"></script>']

    def test_slide_dict_shape(self):
        slides = parse_markdown_to_slides("# T")
        assert set(slides[0].keys()) == {"html", "mermaid", "notes", "raw", "scripts", "title"}

    def test_separator_inside_code_fence_splits_known_limitation(self):
        # Known limitation (documented in docs/maintenance.md): the split is a
        # plain regex and does not respect ``` fences, so a bare --- inside a
        # code block starts a new slide.
        content = "# Code\n\n```\n---\n```\n\n---\n\n# Next"
        slides = parse_markdown_to_slides(content)
        assert len(slides) == 3

    def test_video_link(self):
        out = process_media_links("![video](movie.mp4)")
        assert '<video controls' in out
        assert 'src="movie.mp4"' in out

    def test_svg_image(self):
        out = process_media_links("![svg](pic.svg)")
        assert "<img" in out
        assert 'src="pic.svg"' in out

    def test_sized_image(self):
        out = process_media_links("![img](pic.png){width=300}")
        assert 'style="width: 300"' in out

    def test_youtube_watch_url(self):
        out = process_media_links("![youtube](https://www.youtube.com/watch?v=dQw4w9WgXcQ)")
        assert "youtube.com/embed/dQw4w9WgXcQ" in out
        assert "<iframe" in out

    def test_youtube_short_url(self):
        out = process_media_links("![youtube](https://youtu.be/dQw4w9WgXcQ)")
        assert "youtube.com/embed/dQw4w9WgXcQ" in out

    def test_vimeo(self):
        out = process_media_links("![vimeo](https://vimeo.com/76979871)")
        assert "player.vimeo.com/video/76979871" in out

    def test_plain_text_untouched(self):
        assert process_media_links("just text") == "just text"
