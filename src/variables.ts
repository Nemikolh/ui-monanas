interface GraphVar {
    graph_height: string;
    graph_width: string;
}

export const {graph_width, graph_height} = require<GraphVar>('!!sass-variables!./_variables.scss');

export const graph_width_number = parseInt(graph_width.substr(0, graph_width.indexOf('px')), 10);
export const graph_height_number = parseInt(graph_height.substr(0, graph_height.indexOf('px')), 10);