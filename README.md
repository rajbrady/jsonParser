# jsonParser

This JsonParser is integrated within Itential's adapter engine as it helps clean up the JSON before it goes through specific conversions

1) Dereferencing
- With normal references that are not circular it extrapolates said references and implements them where it is called. It also deletes the initial definition, as it is not necessary any more.
2) Circular References
- With circular references, the parser goes through and outputs one iteration of the circular reference and as with the initial dereferences, it deletes the initial definition. 
3) Clean Definitions and Components 
- As the file is dereferenced these sections of Swagger and OpenAPI are no longer necessary 
4) Clean API file
- Iterates through the file to eliminate unnecessary information and empty portions of the JSON that was there before or a result of the dereferencing
5) Delete Formats 
- Formats within object parts of the JSON sometimes cause issues when building adapters.
6) Wrap References
- Often times, dereferencing can lead to some issues within the integration of the references with other aspects of the JSON, so wrapping the references within a type object helps solve these issues.
7) Detect Type
- The parser also detects the type of swagger/openapi file we are working with 
