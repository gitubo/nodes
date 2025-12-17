export class PluginLoader {
    constructor(registry) {
        this.registry = registry;
    }

    async loadFromManifest(manifestUrl) {
        try {
            const response = await fetch(manifestUrl);
            const manifest = await response.json();

            const absoluteManifestUrl = new URL(manifestUrl, document.baseURI).href;
            const basePath = absoluteManifestUrl.substring(0, absoluteManifestUrl.lastIndexOf('/') + 1);

            if (manifest.handles) {
                await this._loadPlugins(manifest.handles, 'handler', basePath);
            }

            if (manifest.nodes) {
                await this._loadPlugins(manifest.nodes, 'node', basePath);
            }
            
            if (manifest.strategies) {
                await this._loadPlugins(manifest.strategies, 'strategy', basePath);
            }

            console.log("Plugins loaded successfully from:", basePath);
            
        } catch (error) {
            console.error("Failed to load plugins:", error);
        }
    }

    async _loadPlugins(fileList, category, basePath) {
        for (const relativePath of fileList) {
            try {
                const cleanPath = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
                const fullPath = basePath + cleanPath;

                const module = await import(fullPath);
                
                const PluginClass = module.default;
                if (!PluginClass) continue;

                const type = PluginClass.type;
                if (category === 'node') {
                    this.registry.registerNode(type, PluginClass);
                } else if (category === 'handler') {
                    this.registry.registerHandler(type, PluginClass);
                } else if (category === 'strategy') {
                    this.registry.registerStrategy(type, Plugin);
                }

            } catch (err) {
                console.error(`Error loading ${category} plugin from ${relativePath}:`, err);
            }
        }
    }
}