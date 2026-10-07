1. **Reusable** 'components/texcra-ui/relationship-multi-select/drawers'

2. **Fuzzy Search**

- uFuzzy: Cực kỳ nhanh, sinh ra cho tập dữ liệu cực lớn, tối ưu hóa bộ nhớ (nhanh hơn Fuse.js hàng chục lần).

3. **Refactor the redux store**
   in `/home/tien/Documents/code/texcra/src/lexical/editor-RTK/editorSlice.ts` setPostId() :43

   Make the Redux Slice tree-shakable

4. **Refactor the editor workspace**
   - split the editor workspace into smaller components apply the Redux Selection in each component to avoid unnecessary re-renders
