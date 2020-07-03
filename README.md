# Lightbox-like Image viewer for React
lightbox like image viewer for react with zoom, rotate and move feature with single or multi image and touch support

## How to use 

### Initial Setup

To install, run the following command with your favourite package manager: 
```shell
yarn add react-awesome-lightbox
```
Once installed, include it in your project like this: 
```js
import Lightbox from "react-awesome-lightbox";
// You need to import the CSS only once
import "react-awesome-lightbox/build/style.css";
```
Then use it like this for single image:

```jsx
<Lightbox image="image_url" title="Image Title">
```
 or for multiple images: 

```jsx
let images = [
    {
        url:"image_url1",
        title:"image title 1"
    },
    {
        url:"image_url2",
        title:"image title 2"
    }
]
<Lightbox images={images}>
```
### Available properties
Lightbox can be customized with the following properties

| property | default | description |
|----------|---------|-------------|
|image|n/a|URL to the image to show<br> while in single image mode|
|title|n/a|Title to show with the single image|
|images|null| Takes an `array` of inage <br> and starts the lightbox <br> in multi image mode. *If you supply both `image` and <br>`images` prop, `image` is ignored. <br> supported formats : `["url1","url2"...]` <br> or<br> `[{url"url",title:"title"}...]`|
|startIndex|0|If the lightbox is in multiple image mode,<br> the starting image index|
|zoomStep|0.3|Step for zoom in or zoom out,<br> 1 means 100% so, default 0.3 means 30%|
|onClose|null|This function determines how to react when the close button is pressed|
|allowZoom|true|Determines if image zoom controls should be shown|
|allowRotate|true|Determine if image rotate controls should be shown|
|allowReset|true|Determine if reset buttons should be shown|
|buttonAlign|"flex-end"|Determine how to align the toolbar buttons <br> options are: `flex-end`, `flex-start`, `center`| 
|showTitle|true|Determines if title should be shown if available|
|visible|true|Determine if the lightbox will be <br> visible. helpful when you are <br> planning to show it depending on a condition|


**** 

Released under the MIT license. Contributions are welcome 🖤
