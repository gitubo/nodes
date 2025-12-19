// src/services/PluginLoader.js

export class PluginLoader {
    constructor(registry) {
        this.registry = registry;
        this.loadedStyles = new Set(); // Prevent duplicate CSS loading
    }

    /**
     * Loads plugins from a JSON manifest.
     * Expected structure: { "pluginName": { nodes: [], styles: [], ... } }
     */
    async loadFromManifest(manifestUrl) {
        try {
            const response = await fetch(manifestUrl);
            const manifest = await response.json();

            // Calculate base path relative to the manifest location
            const absoluteManifestUrl = new URL(manifestUrl, document.baseURI).href;
            const basePath = absoluteManifestUrl.substring(0, absoluteManifestUrl.lastIndexOf('/') + 1);

            // Iterate over each plugin bundle defined in the JSON
            for (const [pluginName, bundle] of Object.entries(manifest)) {
                console.groupCollapsed(`[PluginLoader] Loading bundle: ${pluginName}`);
                await this._loadPluginBundle(pluginName, bundle, basePath);
                console.groupEnd();
            }

            console.log("All plugins processed.");

        } catch (error) {
            console.error("Critical: Failed to load plugin manifest:", error);
        }
    }

    async _loadPluginBundle(name, bundle, basePath) {
        // 1. Register Configuration (Point 5)
        if (bundle.config) {
            // Assuming Registry has a method for this, or we store it in a global config map
            // For now, we extend the registry capability or access a global config
            if (this.registry.registerConfig) {
                this.registry.registerConfig(name, bundle.config);
            } else {
                console.warn(`Registry does not support config registration. Skipping config for ${name}`);
            }
        }

        // 2. Inject Styles (Point 4 - CSS Files)
        if (bundle.styles && Array.isArray(bundle.styles)) {
            bundle.styles.forEach(stylePath => this._injectStyle(basePath + stylePath));
        }

        // 3. Load Logic Modules (Nodes, Handles, Strategies)
        const loadPromises = [];

        if (bundle.handles) {
            loadPromises.push(this._loadModules(bundle.handles, 'handler', basePath));
        }
        if (bundle.nodes) {
            loadPromises.push(this._loadModules(bundle.nodes, 'node', basePath));
        }
        if (bundle.strategies) {
            loadPromises.push(this._loadModules(bundle.strategies, 'strategy', basePath));
        }

        await Promise.all(loadPromises);
    }

    _injectStyle(href) {
        if (this.loadedStyles.has(href)) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        
        // Append to head. Since this runs after main.css is loaded, 
        // these styles will naturally override core defaults.
        document.head.appendChild(link);
        this.loadedStyles.add(href);
        console.log(`   + Style injected: ${href}`);
    }

    async _loadModules(fileList, category, basePath) {
        for (const relativePath of fileList) {
            try {
                const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                const fullPath = basePath + cleanPath;

                const module = await import(fullPath);
                const PluginClass = module.default;

                if (!PluginClass) {
                    console.warn(`   ! Skipping ${relativePath}: No default export found.`);
                    continue;
                }

                const type = PluginClass.type;
                if (!type) {
                     throw new Error(`Class in ${relativePath} missing static 'type' getter.`);
                }

                // Register based on Category
                switch (category) {
                    case 'node':
                        this.registry.registerNode(type, PluginClass);
                        break;
                    case 'handler':
                        this.registry.registerHandler(type, PluginClass);
                        break;
                    case 'strategy':
                        this.registry.registerStrategy(type, PluginClass);
                        break;
                }
                console.log(`   + Loaded ${category}: ${type}`);

            } catch (err) {
                console.error(`   x Error loading ${category} from ${relativePath}:`, err);
            }
        }
    }
}