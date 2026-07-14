package com.caobolun.ai.rag.chunk;

/**
 * 文本归一化工具
 * 在分片前对原始文本做无损预处理，修复常见格式问题
 */
public final class TextNormalizer {

    private TextNormalizer() {
    }

    /**
     * 执行所有归一化规则
     */
    public static String normalize(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }
        String s = text.replace("\r\n", "\n").replace("\r", "\n");
        s = fixUrlLineBreaks(s);
        s = fixChineseSoftLineBreaks(s);
        return s;
    }

    /**
     * 修复 URL 被换行断开的问题
     * http://example.\n com → http://example.com
     */
    static String fixUrlLineBreaks(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        int i = 0;
        while (i < text.length()) {
            if (text.startsWith("http://", i) || text.startsWith("https://", i)) {
                int urlStart = i;
                int urlEnd = scanUrlEnd(text, i);
                // 提取 URL 并移除内部换行
                String rawUrl = text.substring(urlStart, urlEnd);
                String cleanedUrl = rawUrl.replace("\n", "").replace(" ", "");
                sb.append(cleanedUrl);
                i = urlEnd;
            } else {
                sb.append(text.charAt(i));
                i++;
            }
        }
        return sb.toString();
    }

    /**
     * 扫描 URL 结束位置（遇到空白符或行尾为止）
     */
    private static int scanUrlEnd(String text, int start) {
        int i = start;
        while (i < text.length()) {
            char c = text.charAt(i);
            if (c == ' ' || c == '\t' || c == '\n') {
                // 检查是否在 URL 内部（换行后仍是 URL 字符）
                if (c == '\n' && i + 1 < text.length()) {
                    char next = text.charAt(i + 1);
                    if (isUrlChar(next)) {
                        i++;
                        continue;
                    }
                }
                break;
            }
            i++;
        }
        return i;
    }

    private static boolean isUrlChar(char c) {
        return Character.isLetterOrDigit(c)
                || c == '.' || c == '/' || c == '?' || c == '&'
                || c == '=' || c == '-' || c == '_' || c == '~'
                || c == '#' || c == '%' || c == ':' || c == '@'
                || c == '!' || c == '$' || c == '+' || c == ','
                || c == ';' || c == '*';
    }

    /**
     * 修复中文词间的软换行（商\n保通 → 商保通）
     * 只合并两个中文字符之间的单个换行
     */
    static String fixChineseSoftLineBreaks(String text) {
        StringBuilder sb = new StringBuilder(text.length());
        int i = 0;
        while (i < text.length()) {
            char c = text.charAt(i);
            if (c == '\n' && i > 0 && i + 1 < text.length()) {
                char prev = text.charAt(i - 1);
                char next = text.charAt(i + 1);
                if (isCjkChar(prev) && isCjkChar(next)) {
                    i++;
                    continue;
                }
            }
            sb.append(c);
            i++;
        }
        return sb.toString();
    }

    private static boolean isCjkChar(char c) {
        Character.UnicodeBlock block = Character.UnicodeBlock.of(c);
        return block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS
                || block == Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS_EXTENSION_A
                || block == Character.UnicodeBlock.CJK_COMPATIBILITY_IDEOGRAPHS;
    }
}