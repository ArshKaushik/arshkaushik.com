// Renders a schema.org JSON-LD block. Invisible — produces a <script> tag and no
// layout. The only <script> in this codebase; analytics all load via SDKs.
//
// On dangerouslySetInnerHTML: this is the sole use in the project, and it
// deliberately reverses a removal (the inline-SVG thumbnail pipeline, see
// learn/vercel-isr-quota.md). It's unavoidable here — React has no other way to
// set a <script> body — but the risk profile is different: the payload is our own
// JSON.stringify output built from typed content modules, not the contents of a
// file read at build time.
//
// The `<` escape is load-bearing, not decoration. Without it, a "</script>"
// appearing inside any string would terminate the tag early and break the page.
// Escaping it as < keeps the JSON valid while making that impossible.
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
