// Renders a schema.org JSON-LD block. JSON-LD (JSON for Linking Data) is the
// format search engines and AI crawlers read structured facts from: it sits in
// a <script> tag, is never displayed, and produces no layout. The only <script>
// in this codebase; the analytics SDKs inject their own.
//
// On dangerouslySetInnerHTML: this is the sole use in the project, and it
// deliberately reverses a removal (the inline-SVG thumbnail pipeline, see
// learn/vercel-isr-quota.md). It's unavoidable here — React has no other way to
// set a <script> body — but the risk profile is different: the payload is our own
// JSON.stringify output built from typed content modules, not the contents of a
// file read at build time.
//
// The \u003c escape below is load-bearing, not decoration. The HTML parser has
// no idea it's looking at JSON — inside a <script> it simply scans forward for
// the first literal "</script>" and treats that as the end of the tag. So if
// that sequence ever appeared inside one of our strings (a case-study title, a
// URL), the tag would close early and the remaining JSON would spill onto the
// page as visible text. Replacing every "<" with its \u003c unicode escape
// makes the sequence impossible to form, while being the exact same string as
// far as any JSON parser is concerned.
export default function JsonLd({ data }: { data: object }) {
    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
                __html: JSON.stringify(data).replace(/</g, "\\u003c"),
            }}
        />
    );
}
