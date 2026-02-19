// Canvas Generator for Photoshop — Artboard Document Builder
// Version: 1.1.0
// License: MIT
// Repo: (add your GitHub repo URL here)
//
// Creates a single PSD with multiple artboards, using standardized naming and a live preview UI.
// Save this as "CanvasGenerator.jsx" in your Photoshop Scripts folder
// Save this as "CanvasGenerator.jsx" in your Photoshop Scripts folder

#target photoshop

// -----------------------------
// Helpers
// -----------------------------
function _cg_trim(s){ return (s === undefined || s === null) ? "" : ("" + s).replace(/^\s+|\s+$/g, ""); }
function _cg_sanitizePart(s){
    s = _cg_trim(s);
    if (!s) return "";
    // Replace whitespace with nothing or underscores? (underscores keep readability)
    s = s.replace(/\s+/g, "");
    // Remove characters invalid for filenames on macOS/Windows
    s = s.replace(/[\\\/:*?"<>|]/g, "_");
    return s;
}
function _cg_safeInt(n, fallback){
    n = parseInt(n, 10);
    return isNaN(n) ? fallback : n;
}


(function() {
    
    // Check if Photoshop supports artboards (CC 2015.5 or later)
    if (parseInt(app.version) < 17) {
        alert("This script requires Photoshop CC 2015.5 or later for artboard support.");
        return;
    }
    
    // Define all canvas presets with platform codes
    var canvases = {
        "BANNERS": [
            {name: "Dashboard Card", width: 318, height: 203, code: "DashboardCard"},
            {name: "Dashboard Desktop", width: 1600, height: 170, code: "DashboardDesktop"},
            {name: "Dashboard Mobile", width: 700, height: 170, code: "DashboardMobile"},
            {name: "Homepage Desktop", width: 1600, height: 550, code: "HomepageDesktop"},
            {name: "Homepage Mobile", width: 700, height: 800, code: "HomepageMobile"},
            {name: "Brand Banner Desktop", width: 1586, height: 380, code: "BrandBannerDesktop"},
            {name: "Brand Banner Mobile", width: 630, height: 340, code: "BrandBannerMobile"}
        ],
        "EMAIL": [
            {name: "Primary", width: 700, height: 700, code: "PrimaryEmail"}
        ],
        "BLOG": [
            {name: "Blog Banner", width: 800, height: 326, code: "BlogBanner"},
            {name: "Blog Social", width: 1200, height: 630, code: "BlogSocial"},
            {name: "Blog Thumbnail", width: 350, height: 263, code: "BlogThumbnail"}
        ],
        "MEDIA SCREENS": [
            {name: "Media Screen", width: 1080, height: 1920, code: "MediaScreen"}
        ]
    };
    
    // Define seasons, collections, and platforms
    var seasons = ["SPRING2026", "SUMMER2026", "FALL2026", "WINTER2026"];
    var collections = [
        "TheEssentialEdit",
        "SpringBreakHits",
        "SpringBreakOnShuffle"
    ];
    var platforms = ["SALE", "EMAIL", "BLOG", "BANNER", "RETOUCH", "WEBSITE", "HOMEPAGES"];
    
    // Create dialog window
    var dlg = new Window("dialog", "Canvas Generator");
    dlg.alignChildren = "left";
    
    // Naming section
    var namingPanel = dlg.add("panel", undefined, "File Naming");
    namingPanel.alignChildren = "left";
    namingPanel.margins = 15;
    
    // Season dropdown
    var seasonGroup = namingPanel.add("group");
    seasonGroup.add("statictext", undefined, "Season:");
    var seasonDropdown = seasonGroup.add("dropdownlist", undefined, seasons);
    seasonDropdown.selection = 0;
    seasonDropdown.preferredSize.width = 150;
    
    // Collection dropdown
    var collectionGroup = namingPanel.add("group");
    collectionGroup.add("statictext", undefined, "Collection:");
    var collectionDropdown = collectionGroup.add("dropdownlist", undefined, collections);
    collectionDropdown.selection = 0;
    collectionDropdown.preferredSize.width = 200;
    
    // Platform dropdown
    var platformGroup = namingPanel.add("group");
    platformGroup.add("statictext", undefined, "Platform:");
    var platformDropdown = platformGroup.add("dropdownlist", undefined, platforms);
    platformDropdown.selection = 0;
    platformDropdown.preferredSize.width = 150;
    
    // Version input
    var versionGroup = namingPanel.add("group");
    versionGroup.add("statictext", undefined, "Version:");
    var versionInput = versionGroup.add("edittext", undefined, "V1");
    versionInput.preferredSize.width = 80;
    
    // Live Preview panel
    var previewPanel = dlg.add("panel", undefined, "Live Preview");
    previewPanel.alignChildren = "left";
    previewPanel.margins = 15;
    previewPanel.preferredSize.width = 450;

    var previewDocName = previewPanel.add("statictext", undefined, "Document Name: —");
    previewDocName.preferredSize.width = 420;

    var previewSummary = previewPanel.add("statictext", undefined, "Artboards: 0 | Estimated Document: —");
    previewSummary.preferredSize.width = 420;

    var previewArtboards = previewPanel.add("edittext", undefined, "", { multiline: true, readonly: true, scrolling: true });
    previewArtboards.preferredSize.width = 420;
    previewArtboards.preferredSize.height = 120;

    // Compute estimated layout bounds using the same placement logic as creation
    function computeLayout(selected, artboardsPerRow, xStart, yStart, spacing) {
        var x = xStart, y = yStart;
        var col = 0;
        var rowHeight = 0;
        var rightMost = 0;
        var bottomMost = 0;
        var positions = [];

        for (var i = 0; i < selected.length; i++) {
            var c = selected[i].data;

            positions.push({
                x: x,
                y: y,
                w: c.width,
                h: c.height
            });

            // Track bounds
            rightMost = Math.max(rightMost, x + c.width);
            bottomMost = Math.max(bottomMost, y + c.height);

            // Track tallest in row
            rowHeight = Math.max(rowHeight, c.height);

            // Advance
            col++;
            if (col >= artboardsPerRow) {
                x = xStart;
                y += rowHeight + spacing;
                col = 0;
                rowHeight = 0;
            } else {
                x += c.width + spacing;
            }
        }

        // Add a little padding so nothing kisses the edge
        return {
            docWidth: rightMost + xStart,
            docHeight: bottomMost + yStart,
            positions: positions
        };
    }

    // Function to update preview (name + selected artboards + estimated doc size)
    function updatePreview() {
        var season = seasonDropdown.selection ? seasonDropdown.selection.text : seasons[0];
        var collection = collectionDropdown.selection ? collectionDropdown.selection.text : collections[0];
        var platform = platformDropdown.selection ? platformDropdown.selection.text : platforms[0];
        var version = versionInput.text || "V1";

        // Sanitize parts for safe filenames (keeps your underscores between fields)
        var docName =
            _cg_sanitizePart(season) + "_" +
            _cg_sanitizePart(collection) + "_" +
            _cg_sanitizePart(platform) + "_" +
            _cg_sanitizePart(version);

        previewDocName.text = "Document Name: " + docName;

        // Build selected list
        var lines = [];
        var selected = [];
        for (var i = 0; i < checkboxes.length; i++) {
            if (checkboxes[i].checkbox.value) {
                selected.push(checkboxes[i]);
                var item = checkboxes[i].data;
                lines.push("• " + item.name + " — " + item.width + "×" + item.height);
            }
        }

        if (selected.length === 0) {
            previewSummary.text = "Artboards: 0 | Estimated Document: —";
            previewArtboards.text = "(none selected)";
            return;
        }

        // Match your creation layout params
        var xStart = 50, yStart = 50, spacing = 50, artboardsPerRow = 3;
        var layout = computeLayout(selected, artboardsPerRow, xStart, yStart, spacing);

        previewSummary.text =
            "Artboards: " + selected.length +
            " | Estimated Document: " + layout.docWidth + "×" + layout.docHeight + " px";

        previewArtboards.text = "Artboards to be created:

" + lines.join("
");
    }

    // Add event listeners for live preview
    seasonDropdown.onChange = updatePreview;
    collectionDropdown.onChange = updatePreview;
    platformDropdown.onChange = updatePreview;
    versionInput.onChanging = updatePreview;

    // Add instruction text

    var instrPanel = dlg.add("panel", undefined, "Select canvases to create:");
    instrPanel.alignChildren = "left";
    instrPanel.add("statictext", undefined, "Check all canvas sizes you need for this project:");
    
    // Store checkbox references
    var checkboxes = [];
    
    // Create checkboxes for each category
    for (var category in canvases) {
        var categoryPanel = dlg.add("panel", undefined, category);
        categoryPanel.alignChildren = "left";
        categoryPanel.margins = 15;
        
        var items = canvases[category];
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var cb = categoryPanel.add("checkbox", undefined, 
                item.name + " (" + item.width + "x" + item.height + ")");
                                    cb.onClick = updatePreview;
checkboxes.push({
                checkbox: cb,
                data: item,
                category: category
            });
        }
    }
    
    // Add buttons
    var btnGroup = dlg.add("group");
    btnGroup.alignment = "center";
    var btnCreate = btnGroup.add("button", undefined, "Create Artboards", {name: "ok"});
    var btnCancel = btnGroup.add("button", undefined, "Cancel", {name: "cancel"});
    
    // Helper function to create an artboard
    function createArtboard(artboardName, left, top, width, height) {
        var idMk = charIDToTypeID("Mk  ");
        var desc1 = new ActionDescriptor();
        var idnull = charIDToTypeID("null");
        var ref1 = new ActionReference();
        var idartboardSection = stringIDToTypeID("artboardSection");
        ref1.putClass(idartboardSection);
        desc1.putReference(idnull, ref1);
        
        var idlayerSectionStart = stringIDToTypeID("layerSectionStart");
        desc1.putInteger(idlayerSectionStart, 21);
        
        var idlayerSectionEnd = stringIDToTypeID("layerSectionEnd");
        desc1.putInteger(idlayerSectionEnd, 22);
        
        var idNm = charIDToTypeID("Nm  ");
        desc1.putString(idNm, artboardName);
        
        var idartboard = stringIDToTypeID("artboard");
        var desc2 = new ActionDescriptor();
        var idartboardRect = stringIDToTypeID("artboardRect");
        var desc3 = new ActionDescriptor();
        var idTop = charIDToTypeID("Top ");
        desc3.putDouble(idTop, top);
        var idLeft = charIDToTypeID("Left");
        desc3.putDouble(idLeft, left);
        var idBtom = charIDToTypeID("Btom");
        desc3.putDouble(idBtom, top + height);
        var idRght = charIDToTypeID("Rght");
        desc3.putDouble(idRght, left + width);
        var idclassFloatRect = stringIDToTypeID("classFloatRect");
        desc2.putObject(idartboardRect, idclassFloatRect, desc3);
        desc1.putObject(idartboard, idartboard, desc2);
        
        executeAction(idMk, desc1, DialogModes.NO);
    }
    
    // Helper function to convert layer to artboard
    function convertLayerToArtboard(layer, artboardName, left, top, width, height) {
        try {
            // Select the layer
            app.activeDocument.activeLayer = layer;
            
            // Convert to artboard using ActionManager
            var idconvertToArtboard = stringIDToTypeID("convertToArtboard");
            var desc1 = new ActionDescriptor();
            var idnull = charIDToTypeID("null");
            var ref1 = new ActionReference();
            var idLyr = charIDToTypeID("Lyr ");
            ref1.putEnumerated(idLyr, charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
            desc1.putReference(idnull, ref1);
            
            var idartboard = stringIDToTypeID("artboard");
            var desc2 = new ActionDescriptor();
            var idartboardRect = stringIDToTypeID("artboardRect");
            var desc3 = new ActionDescriptor();
            var idTop = charIDToTypeID("Top ");
            desc3.putDouble(idTop, top);
            var idLeft = charIDToTypeID("Left");
            desc3.putDouble(idLeft, left);
            var idBtom = charIDToTypeID("Btom");
            desc3.putDouble(idBtom, top + height);
            var idRght = charIDToTypeID("Rght");
            desc3.putDouble(idRght, left + width);
            var idclassFloatRect = stringIDToTypeID("classFloatRect");
            desc2.putObject(idartboardRect, idclassFloatRect, desc3);
            desc1.putObject(idartboard, idartboard, desc2);
            
            executeAction(idconvertToArtboard, desc1, DialogModes.NO);
            
            // Rename the artboard
            app.activeDocument.activeLayer.name = artboardName;
            
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Initialize preview
    updatePreview();

    // Show dialog
    if (dlg.show() == 1) {
        try {
            // Get naming parameters
            var season = seasonDropdown.selection.text;
            var collection = collectionDropdown.selection.text;
            var platform = platformDropdown.selection.text;
            var version = versionInput.text;
            
            // Collect selected canvases
            var selectedCanvases = [];
            
            for (var i = 0; i < checkboxes.length; i++) {
                if (checkboxes[i].checkbox.value) {
                    selectedCanvases.push({
                        data: checkboxes[i].data,
                        category: checkboxes[i].category
                    });
                }
            }
            
            if (selectedCanvases.length === 0) {
                alert("No canvases were selected.");
                return;
            }
            
            // Estimate parent document size based on artboard layout
            var xStart = 50;
            var yStart = 50;
            var spacing = 50;
            var artboardsPerRow = 3;

            var layout = computeLayout(selectedCanvases, artboardsPerRow, xStart, yStart, spacing);

            // Add a bit of extra padding
            var docWidth = layout.docWidth + 50;
            var docHeight = layout.docHeight + 50;
            
            // Create document name
            var docName = _cg_sanitizePart(season) + "_" + _cg_sanitizePart(collection) + "_" + _cg_sanitizePart(platform) + "_" + _cg_sanitizePart(version);
            
            // Save current units
            var originalRulerUnits = app.preferences.rulerUnits;
            app.preferences.rulerUnits = Units.PIXELS;
            
            // Create new document with artboards enabled
            var docRef = app.documents.add(
                UnitValue(docWidth, "px"),
                UnitValue(docHeight, "px"),
                72,
                docName,
                NewDocumentMode.RGB,
                DocumentFill.TRANSPARENT,
                1
            );
            
            // Restore original units
            app.preferences.rulerUnits = originalRulerUnits;
            
            // Setup layout parameters
            var xOffset = 50;
            var yOffset = 50;
            var spacing = 50;
            var artboardsPerRow = 3;
            var currentCol = 0;
            var currentRowHeight = 0;
            
            // Check if there's a default background layer and convert it if needed
            var defaultLayerConverted = false;
            if (docRef.layers.length > 0) {
                var firstLayer = docRef.layers[0];
                if (firstLayer.typename == "ArtLayer" && selectedCanvases.length > 0) {
                    var firstCanvas = selectedCanvases[0].data;
                    var firstArtboardName = firstCanvas.name + " (" + firstCanvas.width + "x" + firstCanvas.height + ")";
                    
                    // Try to convert the default layer to the first artboard
                    if (convertLayerToArtboard(firstLayer, firstArtboardName, xOffset, yOffset, firstCanvas.width, firstCanvas.height)) {
                        defaultLayerConverted = true;
                        
                        // Update layout for next artboard
                        if (firstCanvas.height > currentRowHeight) {
                            currentRowHeight = firstCanvas.height;
                        }
                        currentCol++;
                        if (currentCol >= artboardsPerRow) {
                            xOffset = 50;
                            yOffset += currentRowHeight + spacing;
                            currentCol = 0;
                            currentRowHeight = 0;
                        } else {
                            xOffset += firstCanvas.width + spacing;
                        }
                    } else {
                        // If conversion failed, try to remove it
                        try {
                            firstLayer.remove();
                        } catch (e) {
                            // Layer couldn't be removed, leave it
                        }
                    }
                }
            }
            
            // Create artboards for each selected canvas
            var startIndex = defaultLayerConverted ? 1 : 0;
            
            for (var i = startIndex; i < selectedCanvases.length; i++) {
                var canvas = selectedCanvases[i].data;
                
                // Create artboard name
                var artboardName = canvas.name + " (" + canvas.width + "x" + canvas.height + ")";
                
                // Create the artboard
                createArtboard(artboardName, xOffset, yOffset, canvas.width, canvas.height);
                
                // Track the tallest artboard in current row
                if (canvas.height > currentRowHeight) {
                    currentRowHeight = canvas.height;
                }
                
                // Move to next position
                currentCol++;
                
                if (currentCol >= artboardsPerRow) {
                    // Move to next row
                    xOffset = 50;
                    yOffset += currentRowHeight + spacing;
                    currentCol = 0;
                    currentRowHeight = 0;
                } else {
                    // Move to next column
                    xOffset += canvas.width + spacing;
                }
            }
            
            alert("Successfully created " + selectedCanvases.length + " artboard(s)!\n\nDocument: " + docName);
            
        } catch (e) {
            alert("Error creating artboards: " + e.message + "\n\nLine: " + e.line);
        }
    }
})();