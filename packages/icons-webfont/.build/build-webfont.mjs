import path from 'node:path';
import { getAllIcons, getCompileOptions, getPackageDir, strokes } from '../../../.build/helpers.mjs';
import { generateFont, generateMainOutlineFont, mergePaths, offsetPath, processIcons, removeComments, reorientPath, splitPaths } from './utilities.mjs';

const DIR = getPackageDir('icons-webfont')
const allIcons = getAllIcons(true);
const tags = Object.entries(
   Object.fromEntries(
      Object.values(allIcons)
         .flat()
         .map(({ name, category }) => [name, { category }])
   )
);

const getProjectCompileOptions = () => {
   const cwd = process.cwd();

   try {
      process.chdir(path.join(DIR, '..'));
      return getCompileOptions(tags);
   } finally {
      process.chdir(cwd);
   }
};

const getStrokeEntries = ({ strokeWidth, strokeWidths }) => {
   const requestedStrokeWidths = strokeWidths || (strokeWidth ? [strokeWidth] : null);

   if (!requestedStrokeWidths) {
      return Object.entries(strokes);
   }

   return requestedStrokeWidths.map((requestedStrokeWidth) => {
      const strokeWidthValue = requestedStrokeWidth.toString();
      const strokeEntry = Object.entries(strokes).find(([, width]) => width.toString() === strokeWidthValue);

      if (!strokeEntry) {
         throw new Error(`Unsupported strokeWidth "${strokeWidthValue}". Available stroke widths: ${Object.values(strokes).join(', ')}`);
      }

      return strokeEntry;
   });
};

const compileOptions = getProjectCompileOptions();
const includeIcons = new Set(compileOptions.includeIcons);
const filterIcons = (files) =>
   includeIcons.size > 0 ? files.filter(({ name }) => includeIcons.has(name)) : files;

const { outline, filled } = allIcons;
const outlineFiles = filterIcons(outline);
const filledFiles = filterIcons(filled);
const strokeEntries = getStrokeEntries(compileOptions);

// Generate outline icons
for await (const [strokeName, strokeWidth] of strokeEntries) {
   const dirname = path.join(DIR, 'icons-outlined', strokeName);
   
   await processIcons(
      outlineFiles,
      dirname,
      'outline',
      DIR,
      strokeName,
      (svgContent) => {
         svgContent = removeComments(svgContent);
         svgContent = splitPaths(svgContent);
         svgContent = offsetPath(svgContent, strokeWidth);
         svgContent = reorientPath(svgContent);
         svgContent = mergePaths(svgContent);
         return svgContent;
      }
   );

   await generateFont(strokeName, 'outline', DIR);
}

generateMainOutlineFont(strokeEntries, outlineFiles, DIR);

// Generate filled icons
const filledDirname = path.join(DIR, 'icons-filled');
await processIcons(filledFiles, filledDirname, 'filled', DIR);
await generateFont('filled', 'filled', DIR);
