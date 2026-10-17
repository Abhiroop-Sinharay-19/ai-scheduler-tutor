import { pipeline } from "@huggingface/transformers";

export const EMBEDDING_MODEL = "Supabase/gte-small";
export const EMBEDDING_DIMENSION = 384;

let extractorPromise;

async function getExtractor() {
  extractorPromise ??= pipeline("feature-extraction", EMBEDDING_MODEL, { dtype: "q8" });
  return extractorPromise;
}

export async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.some((text) => typeof text !== "string" || !text.trim())) {
    throw new Error("Embedding input must be a non-empty list of text strings.");
  }

  const extractor = await getExtractor();
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const vectors = output.tolist();
  if (
    output.dims.length !== 2 ||
    output.dims[0] !== texts.length ||
    output.dims[1] !== EMBEDDING_DIMENSION ||
    vectors.length !== texts.length ||
    vectors.some(
      (vector) =>
        vector.length !== EMBEDDING_DIMENSION || vector.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error(
      `Embedding model returned an unexpected shape; expected ${EMBEDDING_DIMENSION} values.`,
    );
  }

  return vectors;
}
