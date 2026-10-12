## When is it suitable to use the `_` prefix pattern?

You should adopt the underscore prefix pattern in your database or software design in the following situations:

1. **Building Dynamic Schemas or CMS Engines:**
   If your application allows users or developers to dynamically define columns (like Payload's arrays/blocks), you must establish a "reserved namespace" for your internal system columns to prevent fatal collisions.

2. **Developing Libraries and ORMs:**
   When writing a framework where your code must coexist with user code, prefixing your internal properties, methods, or database columns is a standard convention to declare them as "private" or "internal use only," signaling to users that they should not overwrite them.
