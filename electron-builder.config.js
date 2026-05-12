/** @type {import('electron-builder').Configuration} */
export default {
  appId: 'com.colorpicker.app',
  productName: 'ColorPicker',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*',
    'dist-electron/**/*',
  ],
  mac: {
    target: {
      target: 'dmg',
      arch: ['arm64', 'x64'],
    },
    icon: 'public/icon.png',
    category: 'public.app-category.graphics-design',
  },
  dmg: {
    title: 'ColorPicker',
  },
}
