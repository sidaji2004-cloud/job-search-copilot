import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";

/**
 * Convert markdown text into a docx Buffer. We treat the markdown as flat lines:
 * `#` → H1, `##` → H2, `###` → H3, `- ` → bullet, `1.` → numbered, blanks → spacing.
 * Inline `**bold**` is rendered as a bold run.
 */
export async function toDocx(markdown: string, title: string): Promise<Buffer> {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const children: Paragraph[] = [
    new Paragraph({
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: title, bold: true, size: 32 })],
    }),
    new Paragraph({ text: "" }),
  ];

  const inlineRuns = (text: string): TextRun[] => {
    const runs: TextRun[] = [];
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    for (const part of parts) {
      if (!part) continue;
      if (part.startsWith("**") && part.endsWith("**")) {
        runs.push(new TextRun({ text: part.slice(2, -2), bold: true }));
      } else {
        runs.push(new TextRun({ text: part }));
      }
    }
    return runs.length ? runs : [new TextRun({ text })];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }
    if (line.startsWith("### ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: inlineRuns(line.slice(4)),
        })
      );
    } else if (line.startsWith("## ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: inlineRuns(line.slice(3)),
        })
      );
    } else if (line.startsWith("# ")) {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: inlineRuns(line.slice(2)),
        })
      );
    } else if (/^\s*[-*]\s+/.test(line)) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          children: inlineRuns(line.replace(/^\s*[-*]\s+/, "")),
        })
      );
    } else if (/^\s*\d+\.\s+/.test(line)) {
      children.push(
        new Paragraph({
          numbering: { reference: "default-numbering", level: 0 },
          children: inlineRuns(line.replace(/^\s*\d+\.\s+/, "")),
        })
      );
    } else {
      children.push(new Paragraph({ children: inlineRuns(line) }));
    }
  }

  const doc = new Document({
    creator: "Job Search Copilot",
    title,
    sections: [{ properties: {}, children }],
  });
  return await Packer.toBuffer(doc);
}

/**
 * Lightweight markdown → PDF. We render via @react-pdf/renderer on the server.
 * The visual is intentionally plain — single column, generous margins.
 */
export async function toPdf(markdown: string, title: string): Promise<Buffer> {
  // Lazy-require so the heavy renderer doesn't load on every request.
  const { renderToBuffer, Document: PDoc, Page, Text, View, StyleSheet } = await import(
    "@react-pdf/renderer"
  );
  const React = await import("react");

  const styles = StyleSheet.create({
    page: { padding: 48, fontSize: 11, fontFamily: "Helvetica", lineHeight: 1.5, color: "#1a1a1a" },
    title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 16 },
    h1: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 6 },
    h2: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 10, marginBottom: 4 },
    p: { marginBottom: 6 },
    bullet: { marginBottom: 4, paddingLeft: 12 },
  });

  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const nodes: React.ReactElement[] = [
    React.createElement(Text, { key: "title", style: styles.title }, title),
  ];

  // Render bold inline by splitting on **...** and turning matches into a styled Text.
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return React.createElement(
          Text,
          { key: i, style: { fontFamily: "Helvetica-Bold" } },
          part.slice(2, -2)
        );
      }
      return React.createElement(Text, { key: i }, part);
    });
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) {
      nodes.push(React.createElement(Text, { key: i, style: { marginBottom: 6 } }, " "));
      return;
    }
    if (line.startsWith("## ")) {
      nodes.push(React.createElement(Text, { key: i, style: styles.h2 }, line.slice(3)));
    } else if (line.startsWith("# ")) {
      nodes.push(React.createElement(Text, { key: i, style: styles.h1 }, line.slice(2)));
    } else if (/^\s*[-*]\s+/.test(line)) {
      nodes.push(
        React.createElement(
          Text,
          { key: i, style: styles.bullet },
          "• ",
          ...renderInline(line.replace(/^\s*[-*]\s+/, ""))
        )
      );
    } else if (/^\s*\d+\.\s+/.test(line)) {
      nodes.push(
        React.createElement(Text, { key: i, style: styles.bullet }, ...renderInline(line))
      );
    } else {
      nodes.push(
        React.createElement(Text, { key: i, style: styles.p }, ...renderInline(line))
      );
    }
  });

  const docEl = React.createElement(
    PDoc,
    {},
    React.createElement(Page, { size: "LETTER", style: styles.page } as never, React.createElement(View, {}, ...nodes))
  );
  return (await renderToBuffer(docEl as never)) as Buffer;
}
