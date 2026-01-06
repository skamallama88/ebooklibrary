Future features to add

- [ ] Ability to read .txt, .rtf and other text formats
- [ ] Convert between formats (eg .pdf to .epub)
- [ ] Plugin support?
- [ ] Duplicate Handling
- [ ] Word Count
- [x] Column to show read
- [x] Column to show reading progress
- [x] Add remove coumns per user requirements
- [x] rating Column
- [ ] Method to add rating.
- [ ] Duplicate Handling
- [ ] 


Add suport for "writing metadata to files" (like Calibre's "Embed Metadata" feature), we would need to add specific libraries like lxml or pikepdf to modify the binary files directly, but currently, the database remains the "source of truth" for the UI.
This should be done as an option when downloading a book. ie keep original metadata, or embed metadata into the file.