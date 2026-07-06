// Parallel-route fallback for the @modal slot: render nothing when the URL
// isn't a case-study modal (e.g. on "/", or on a hard load of /work/[slug]).
export default function ModalDefault() {
    return null;
}
