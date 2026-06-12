from app.parsers.base import BaseParser, ParsedPaper


class MockParser(BaseParser):
    """A mock parser that returns realistic sample data for an NLP/transformers
    research paper.  Useful for development, testing, and demo flows where a
    real PDF parsing library is not available.
    """

    def parse(self, file_path: str) -> ParsedPaper:
        """Return a hard-coded ``ParsedPaper`` mimicking a real NLP paper.

        The *file_path* argument is accepted but intentionally ignored so that
        the mock parser can be used in any context without requiring an actual
        file on disk.
        """

        title = "Attention Is All You Need"

        abstract = (
            "The dominant sequence transduction models are based on complex recurrent "
            "or convolutional neural networks that include an encoder and a decoder. "
            "The best performing models also connect the encoder and decoder through an "
            "attention mechanism. We propose a new simple network architecture, the "
            "Transformer, based solely on attention mechanisms, dispensing with "
            "recurrence and convolutions entirely. Experiments on two machine "
            "translation tasks show these models to be superior in quality while being "
            "more parallelizable and requiring significantly less time to train. Our "
            "model achieves 28.4 BLEU on the WMT 2014 English-to-German translation "
            "task, improving over the existing best results, including ensembles, by "
            "over 2 BLEU. On the WMT 2014 English-to-French translation task, our model "
            "establishes a new single-model state-of-the-art BLEU score of 41.8 after "
            "training for 3.5 days on eight GPUs, a small fraction of the training costs "
            "of the best models from the literature."
        )

        sections = {
            "Introduction": (
                "Recurrent neural networks, long short-term memory and gated recurrent "
                "neural networks in particular, have been firmly established as state "
                "of the art approaches in sequence modeling and transduction problems "
                "such as language modeling and machine translation. Numerous efforts have "
                "since continued to push the boundaries of recurrent language models and "
                "encoder-decoder architectures."
            ),
            "Background": (
                "The goal of reducing sequential computation also forms the foundation "
                "of the Extended Neural GPU, ByteNet and ConvS2S, all of which use "
                "convolutional neural networks as basic building block, computing hidden "
                "representations in parallel for all input and output positions. In these "
                "models, the number of operations required to relate signals from two "
                "arbitrary input or output positions grows in the distance between "
                "positions, linearly for ConvS2S and logarithmically for ByteNet."
            ),
            "Model Architecture": (
                "Most competitive neural sequence transduction models have an "
                "encoder-decoder structure. Here, the encoder maps an input sequence of "
                "symbol representations to a sequence of continuous representations. "
                "Given the encoded sequence, the decoder then generates an output "
                "sequence one element at a time. At each step the model is auto-"
                "regressive, consuming the previously generated symbols as additional "
                "input when generating the next."
            ),
            "Attention Mechanism": (
                "An attention function can be described as mapping a query and a set of "
                "key-value pairs to an output, where the query, keys, values, and output "
                "are all vectors. The output is computed as a weighted sum of the values, "
                "where the weight assigned to each value is computed by a compatibility "
                "function of the query with the corresponding key."
            ),
            "Training": (
                "This section describes the training regime for our models. We trained "
                "our models on one machine with 8 NVIDIA P100 GPUs. For our base models, "
                "each training step took about 0.4 seconds. We trained the base models "
                "for a total of 100,000 steps or 12 hours. For our big models, step time "
                "was 1.0 seconds. The big models were trained for 300,000 steps (3.5 "
                "days)."
            ),
            "Results": (
                "On the WMT 2014 English-to-German translation task, the big transformer "
                "model outperforms the best previously reported models (including "
                "ensembles) by more than 2.0 BLEU, establishing a new state-of-the-art "
                "BLEU score of 28.4. On the WMT 2014 English-to-French translation task, "
                "our big model achieves a BLEU score of 41.8, outperforming all of the "
                "previously published single and ensemble models."
            ),
            "Conclusion": (
                "In this work, we presented the Transformer, the first sequence "
                "transduction model based entirely on attention, replacing the recurrent "
                "layers most commonly used in encoder-decoder architectures with "
                "multi-headed self-attention. We plan to apply the Transformer to other "
                "tasks. We plan to extend the Transformer to problems involving input and "
                "output modalities other than text and to investigate local, restricted "
                "attention mechanisms to efficiently handle large inputs and outputs."
            ),
        }

        full_text = abstract + "\n\n" + "\n\n".join(
            f"{heading}\n{body}" for heading, body in sections.items()
        )

        references = [
            "Bahdanau, D., Cho, K., & Bengio, Y. (2014). Neural machine translation by jointly learning to align and translate. arXiv preprint arXiv:1409.0473.",
            "Ba, J. L., Kiros, J. R., & Hinton, G. E. (2016). Layer normalization. arXiv preprint arXiv:1607.06450.",
            "Bengio, Y., Simard, P., & Frasconi, P. (1994). Learning long-term dependencies with gradient descent is difficult. IEEE transactions on neural networks, 5(2), 157-166.",
            "Cho, K., Van Merrienboer, B., Gulcehre, C., Bahdanau, D., Bougares, F., Schwenk, H., & Bengio, Y. (2014). Learning phrase representations using RNN encoder-decoder for statistical machine translation. arXiv preprint arXiv:1406.1078.",
            "Gehring, J., Auli, M., Grangier, D., Yarats, D., & Dauphin, Y. N. (2017). Convolutional sequence to sequence learning. arXiv preprint arXiv:1705.03122.",
            "Hochreiter, S., & Schmidhuber, J. (1997). Long short-term memory. Neural computation, 9(8), 1735-1780.",
            "Kalchbrenner, N., & Blunsom, P. (2013). Recurrent continuous translation models. In Proceedings of the 2013 Conference on Empirical Methods in Natural Language Processing.",
            "Luong, M. T., Pham, H., & Manning, C. D. (2015). Effective approaches to attention-based neural machine translation. arXiv preprint arXiv:1508.04025.",
            "Srivastava, N., Hinton, G., Krizhevsky, A., Sutskever, I., & Salakhutdinov, R. (2014). Dropout: a simple way to prevent neural networks from overfitting. The journal of machine learning research, 15(1), 1929-1958.",
            "Sutskever, I., Vinyals, O., & Le, Q. V. (2014). Sequence to sequence learning with neural networks. In Advances in neural information processing systems.",
            "Wu, Y., Schuster, M., Chen, Z., Le, Q. V., Norouzi, M., Macherey, W., ... & Dean, J. (2016). Google's neural machine translation system: Bridging the gap between human and machine translation. arXiv preprint arXiv:1609.08144.",
            "Zhou, J., Cao, Y., Wang, X., Li, P., & Xu, W. (2016). Deep recurrent models with fast-forward connections for neural machine translation. arXiv preprint arXiv:1606.04199.",
        ]

        return ParsedPaper(
            title=title,
            abstract=abstract,
            sections=sections,
            full_text=full_text,
            references=references,
        )
