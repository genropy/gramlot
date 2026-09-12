# Legacy webstruct declarations and resources

Source inspection, 2026-09-11. Inventory, not a migration commitment.

Legacy source: `/Users/gporcari/Sviluppo/Genropy/genropy/gnrpy/gnr/web/gnrwebstruct`.

## Styles and scripts

| Python declaration | Verified browser behavior |
| --- | --- |
| `style(content, **attrs)` | Authors an ordinary HTML style node. |
| `css(rule, styleRule="")` | Formats a complete CSS rule; `_bld_css` calls addCssRule. |
| `styleSheet(cssText=None, cssTitle=None, href=None)` | Inline sheet through addStyleSheet, or external href through loadCss. |
| `script(content="", **attrs)` | External src through loadJs; otherwise evaluates inline JavaScript through dojo.eval during node build. |
| `cssrule(selector=None, **attrs)` | Python emits a cssrule Source node with selector and attributes. A matching dedicated runtime handler was not established in this inspection. |

Runtime evidence: `gnrjs/gnr_d11/js/gnrdomsource.js`, lines 873–890. Do not infer scoped styles, ES modules, awaited dependency ordering or cleanup guarantees from these declarations.

## Inventory boundaries

The tables below list direct method declarations in every class in this package, including private helpers. Namespace lists in dojo11/dojo20 also expose tags dynamically through GnrDomSrc.__getattr__. The registry is case-normalized and extensible via @struct_method; page/component extensions and inherited GnrStructData methods are outside this static package inventory. Method names alone do not prove browser support.

## base.py

### GnrDomElem: 2 direct methods

`__init__`, `__call__`

### GnrDomSrc: 89 direct methods

`js_sourceNode`, `js_widget`, `js_domNode`, `js_form`, `makeRoot`, `_get_page`, `checkNodeId`, `register_nodeId`, `_get_parentfb`, `__getattr__`, `getAttach`, `child`, `htmlChild`, `nodeById`, `fullScreenDialog`, `framepane`, `record`, `chartpane`, `palettechart`, `statspane`, `palettestats`, `frameform`, `formstore`, `multibutton_item`, `multibutton_plusitem`, `multibutton_store`, `treegrid_column`, `treeframe_column`, `quickgrid`, `quickgrid_column`, `quickgrid_selectionstore`, `quickgrid_tools`, `formstore_handler`, `formstore_handler_addcallback`, `iframe`, `htmliframe`, `flexbox`, `expandbox`, `gridbox`, `labledbox`, `htmlform`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `li`, `td`, `th`, `span`, `pre`, `div`, `style`, `details`, `summary`, `a`, `dt`, `option`, `caption`, `button`, `lightbutton`, `semaphore`, `errorPane`, `tooltip`, `data`, `script`, `bagField`, `grouplet`, `groupletform`, `remote`, `func`, `connect`, `subscribe`, `css`, `styleSheet`, `cssrule`, `macro`, `input`, `getMainFormBuilder`, `getFormBuilder`, `mobileFormBuilder`, `setHelperData`, `formbuilder`, `formlet`, `formbuilder_formlet`, `formbuilder_table`, `place`, `getField`

## dojo11.py

### GnrDomSrc_dojo_11: 57 direct methods

`dataFormula`, `dataScript`, `dataController`, `dataRpc`, `selectionstore_addcallback`, `datarpc_addcallback`, `datarpc_adderrback`, `slotButton`, `virtualSelectionStore`, `_storeParentFrame`, `selectionStore`, `bagStore`, `fsStore`, `rpcStore`, `sharedObject`, `partitionController`, `partitionSubscriber`, `onDbChanges`, `dataSelection`, `directoryStore`, `tableAnalyzeStore`, `dataRecord`, `dataRemote`, `dataResource`, `paletteGroup`, `docItem`, `ckeditor`, `palettePane`, `paletteTree`, `paletteGrid`, `googlechart`, `googlechart_column`, `includedview_draganddrop`, `newincludedview_footer`, `footer_item`, `newincludedview_draganddrop`, `includedview`, `includedview_inframe`, `includedview_legacy`, `gridStruct`, `slotToolbar`, `slotFooter`, `_addSlot`, `slotBar`, `slotbar_updateslotsattr`, `slotbar_replaceslots`, `button`, `togglebutton`, `radiobutton`, `checkbox`, `dropdownbutton`, `menuline`, `field`, `placeFields`, `radiogroup`, `prepareFieldAttributes`, `wdgAttributesFromColumn`

### GnrDomSrc_dojo_11.htmlNS: 87 entries

`a`, `abbr`, `acronym`, `address`, `area`, `b`, `base`, `bdo`, `big`, `blockquote`, `body`, `br`, `button`, `caption`, `cite`, `code`, `col`, `colgroup`, `dd`, `del`, `div`, `dfn`, `dl`, `dt`, `em`, `fieldset`, `frame`, `frameset`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`, `head`, `hr`, `html`, `i`, `iframe`, `htmliframe`, `flexbox`, `gridbox`, `labledbox`, `img`, `input`, `ins`, `kbd`, `label`, `legend`, `li`, `link`, `map`, `meta`, `noframes`, `noscript`, `object`, `ol`, `optgroup`, `option`, `p`, `param`, `pre`, `q`, `samp`, `select`, `small`, `span`, `strong`, `style`, `sub`, `sup`, `table`, `tbody`, `td`, `textarea`, `tfoot`, `th`, `thead`, `title`, `tr`, `tt`, `ul`, `audio`, `video`, `var`, `embed`, `canvas`

### GnrDomSrc_dojo_11.dijitNS: 43 entries

`CheckBox`, `RadioButton`, `ComboBox`, `CurrencyTextBox`, `DateTextBox`, `DatetimeTextBox`, `InlineEditBox`, `NumberSpinner`, `NumberTextBox`, `HorizontalSlider`, `VerticalSlider`, `Textarea`, `TextBox`, `TimeTextBox`, `ValidationTextBox`, `AccordionContainer`, `AccordionPane`, `ContentPane`, `LayoutContainer`, `BorderContainer`, `SplitContainer`, `StackContainer`, `TabContainer`, `Button`, `ToggleButton`, `ComboButton`, `DropDownButton`, `FilteringSelect`, `Menu`, `Menubar`, `MenuItem`, `Toolbar`, `Dialog`, `ProgressBar`, `TooltipDialog`, `TitlePane`, `Tooltip`, `ColorPalette`, `Editor`, `Tree`, `SimpleTextarea`, `MultiSelect`, `ToolbarSeparator`

### GnrDomSrc_dojo_11.dojoxNS: 32 entries

`FloatingPane`, `Dock`, `RadioGroup`, `ResizeHandle`, `SizingPane`, `BorderContainer`, `FisheyeList`, `Loader`, `Toaster`, `FileInput`, `fileInputBlind`, `FileInputAuto`, `ColorPicker`, `SortList`, `TimeSpinner`, `Iterator`, `ScrollPane`, `Gallery`, `Lightbox`, `SlideShow`, `ThumbnailPicker`, `Chart`, `Deck`, `Slide`, `GoogleMap`, `GoogleChart`, `Calendar`, `GoogleChart`, `GoogleVisualization`, `DojoGrid`, `VirtualGrid`, `VirtualStaticGrid`

### GnrDomSrc_dojo_11.gnrNS: 99 entries

`DbSelect`, `CallBackSelect`, `RemoteSelect`, `PackageSelect`, `TableSelect`, `DbComboBox`, `DbView`, `DbForm`, `DbQuery`, `DbField`, `dataFormula`, `dataScript`, `dataRpc`, `dataController`, `dataRemote`, `gridView`, `viewHeader`, `viewRow`, `script`, `func`, `staticGrid`, `dynamicGrid`, `fileUploader`, `gridEditor`, `ckEditor`, `tinyMCE`, `protovis`, `codemirror`, `proseMirrorEditor`, `mdeditor`, `qrscanner`, `fullcalendar`, `dygraph`, `chartjs`, `MultiButton`, `PaletteGroup`, `DocumentFrame`, `DownloadButton`, `bagEditor`, `PagedHtml`, `DocItem`, `UserObjectLayout`, `UserObjectBar`, `PalettePane`, `PasswordTextBox`, `PaletteMap`, `PaletteImporter`, `DropUploader`, `ModalUploader`, `DropUploaderGrid`, `VideoPickerPalette`, `GeoCoderField`, `StaticMap`, `ImgUploader`, `TooltipPane`, `MenuDiv`, `BagNodeEditor`, `FlatBagEditor`, `PaletteBagNodeEditor`, `StackButtons`, `Palette`, `PaletteTree`, `TreeFrame`, `CheckBoxText`, `RadioButtonText`, `GeoSearch`, `ComboArrow`, `ComboMenu`, `ChartPane`, `PaletteChart`, `ColorTextBox`, `ColorFiltering`, `SearchBox`, `FormStore`, `FramePane`, `FrameForm`, `BoxForm`, `QuickEditor`, `ExtendedCkeditor`, `ExtendedTinyMCE`, `CodeEditor`, `TreeGrid`, `QuickGrid`, `GridGallery`, `VideoPlayer`, `MultiValueEditor`, `MultiLanguageTextBox`, `TextboxMenu`, `MultiLineTextbox`, `QuickTree`, `SharedObject`, `IframeDiv`, `FieldsTree`, `SlotButton`, `TemplateChunk`, `LightButton`, `Semaphore`, `CharCounterTextarea`, `TracebackViewer`

## formbuilder.py

### GnrFormBuilder: 16 direct methods

`__init__`, `br`, `_get_page`, `_get_tbl`, `place`, `setField`, `setFields`, `_fillRows`, `setRowAttr`, `getRowNode`, `getRow`, `nextCell`, `setRow`, `_formRow`, `_lblCellPath`, `_formCell`

## gridstruct.py

### GnrGridStruct: 19 direct methods

`makeRoot`, `_get_page`, `_get_maintable`, `_get_tblobj`, `view`, `info`, `columnsets`, `rows`, `columnset`, `_collist`, `radioButtonSet`, `checkBoxSet`, `cell`, `checkboxcolumn`, `checkboxcell`, `templatecell`, `fieldcell`, `fields`, `getFieldNames`
