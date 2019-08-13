const webpack = require("webpack");
const withLess = require("@zeit/next-less");
const withBundleAnalyzer = require("@zeit/next-bundle-analyzer");

const lessToJS = require("less-vars-to-js");
const fs = require("fs");
const path = require("path");

// Where your antd theme customization file lives
const themeVariables = lessToJS(
    fs.readFileSync(
        path.resolve(__dirname, "./assets/antd-custom.less"),
        "utf8"
    )
);

module.exports = withBundleAnalyzer(
    withLess({
        /* withLess config */
        cssModules: false,
        lessLoaderOptions: {
            javascriptEnabled: true,
            modifyVars: themeVariables, // apply your antd customization
        },
        webpack: (config, { isServer }) => {
            if (isServer) {
                const antStyles = /antd\/.*?\/style.*?/;
                const origExternals = [...config.externals];
                config.externals = [
                    (context, request, callback) => {
                        if (request.match(antStyles)) return callback();
                        if (typeof origExternals[0] === "function") {
                            origExternals[0](context, request, callback);
                        } else {
                            callback();
                        }
                    },
                    ...(typeof origExternals[0] === "function"
                        ? []
                        : origExternals),
                ];

                config.module.rules.unshift({
                    test: antStyles,
                    use: "null-loader",
                });
            }

            // limiting locales of moment.js
            config.plugins.push(
                new webpack.ContextReplacementPlugin(
                    /moment[/\\]locale$/,
                    /en|ru/
                )
            );
            // separating icons into a chunk
            config.module.rules.push({
                loader: "webpack-ant-icon-loader",
                enforce: "pre",
                // options:{
                //   chunkName:'antd-icons'
                // },
                include: [require.resolve("@ant-design/icons/lib/dist")],
            });

            return config;
        },

        /* withBundleAnalyzer config */
        analyzeServer: ["server", "both"].includes(process.env.BUNDLE_ANALYZE),
        analyzeBrowser: ["browser", "both"].includes(
            process.env.BUNDLE_ANALYZE
        ),
        bundleAnalyzerConfig: {
            server: {
                analyzerMode: "static",
                reportFilename: "../bundles/server.html",
            },
            browser: {
                analyzerMode: "static",
                reportFilename: "../bundles/client.html",
            },
        },

        /* Other NextJS config */
    })
);
