Future features to add

1. Ability to read .txt, .rtf and other text formats
2. Convert between formats (eg .pdf to .epub)
3. Plugin support?
4. Duplicate Handling
5. Word Count
6. Column to show read
7. Column to show reading progress
8. Add remove coumns per user requirements
9. rating Column
10. Method to add rating.


Add suport for "writing metadata to files" (like Calibre's "Embed Metadata" feature), we would need to add specific libraries like lxml or pikepdf to modify the binary files directly, but currently, the database remains the "source of truth" for the UI.
This should be done as an option when downloading a book. ie keep original metadata, or embed metadata into the file.