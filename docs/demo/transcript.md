# Demo transcript

This is a silent, captioned walkthrough assembled from real browser screenshots, not a continuous screen recording. Screens were captured during actual app interactions. Receipts are fictional. The paragraphs below provide expanded notes for each scene.

## 01. A little less searching.

Maa ka Drawer is a household receipt finder built for the builder's mother. This walkthrough uses real screenshots captured from the working local app, with fictional receipts. It shows the features that work today. A trial with her is still pending.

## 02. Search in everyday words.

Here, a Hindi phrase for a clothes washing machine finds the English washing machine receipt. The app runs the open multilingual E five small embedding model locally. PostgreSQL combines keyword matches and vector similarity, so the search can work beyond exact wording.

## 03. Keep the proof visible.

Opening a card shows the saved receipt text, including the invoice number, purchase date, amount, and stated warranty date. The app retrieves a document. It does not generate warranty terms or invent dates. Sample receipts are clearly labelled as fictional.

## 04. Sometimes, no match.

A passport renewal query is unrelated to this drawer. The app returns no clear match, rather than presenting an arbitrary receipt as the answer. The similarity gate is a heuristic, not a guarantee. Its known failures are documented in the repository.

## 05. Save it once.

To add a receipt, enter its title and reviewed text. Merchant and dates are optional. Here, a synthetic kettle receipt is attached as a PDF, with its source text entered manually. This version does not read photos automatically. The user confirms the details before saving.

## 06. The original, right there.

After saving, the original PDF renders inside the app, above the entered text. It is also available to download. The fixture says no warranty expiry date is stated, so that date stays blank. The app does not guess a warranty from the product type.

## 07. Tidy up, with an undo.

Archiving the kettle removes it from the active drawer. The original and saved text are retained, and the notification offers Undo. This is a reversible action, so tidying the drawer does not require permanently deleting the proof of purchase.

## 08. Still here after a reload.

Undo restores the receipt, and it remains after reloading the page. Twelve integration tests cover retrieval, exact identifiers, saving, archive and restore, file serving, input validation, and persistence. The demo uses the local PostgreSQL compatible P G Lite backend.

## 09. Open AI. Honest limits.

On a small builder authored evaluation, hybrid search returned the correct first result on twelve of fourteen positive queries, compared with eight for keywords. All four negative queries returned no result. Two Hindi or Hinglish cases failed. Tiger Cloud support is implemented, but its live connection is not yet verified. The code and complete results are public.
