#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <limits.h>

#define MAX_NODES 100
#define MAX_NAME_LEN 50
#define INF INT_MAX

typedef struct {
    char name[MAX_NAME_LEN];
} Node;

int num_nodes = 0;
int num_edges = 0;
Node nodes[MAX_NODES];
int graph[MAX_NODES][MAX_NODES]; // Stores base distance
int current_weights[MAX_NODES][MAX_NODES]; // Stores distance * traffic_penalty

int get_node_index(char *name) {
    for (int i = 0; i < num_nodes; i++) {
        if (strcmp(nodes[i].name, name) == 0) return i;
    }
    return -1;
}

void load_graph(const char *filename) {
    FILE *f = fopen(filename, "r");
    if (!f) {
        fprintf(stderr, "Error opening %s\n", filename);
        exit(1);
    }
    
    fscanf(f, "%d %d", &num_nodes, &num_edges);
    
    for (int i = 0; i < num_nodes; i++) {
        fscanf(f, "%s", nodes[i].name);
    }
    
    // Initialize graph matrices
    for (int i = 0; i < num_nodes; i++) {
        for (int j = 0; j < num_nodes; j++) {
            graph[i][j] = INF;
            current_weights[i][j] = INF;
        }
    }
    
    for (int i = 0; i < num_edges; i++) {
        char u_name[MAX_NAME_LEN], v_name[MAX_NAME_LEN];
        int dist;
        fscanf(f, "%s %s %d", u_name, v_name, &dist);
        int u = get_node_index(u_name);
        int v = get_node_index(v_name);
        if (u != -1 && v != -1) {
            graph[u][v] = dist;
            graph[v][u] = dist; // Assuming undirected roads
            current_weights[u][v] = dist;
            current_weights[v][u] = dist;
        }
    }
    fclose(f);
}

void apply_traffic(int argc, char *argv[]) {
    // argv[1]: start
    // argv[2]: end
    // argv[3+]: u, v, penalty
    for (int i = 3; i + 2 < argc; i += 3) {
        int u = get_node_index(argv[i]);
        int v = get_node_index(argv[i+1]);
        int penalty = atoi(argv[i+2]);
        if (u != -1 && v != -1 && graph[u][v] != INF) {
            current_weights[u][v] = graph[u][v] * penalty;
            current_weights[v][u] = graph[v][u] * penalty;
        }
    }
}

void print_json(int *path, int path_len, int total_cost, int start, int end, const char* error) {
    printf("{\n");
    if (error) {
        printf("  \"error\": \"%s\"\n", error);
    } else {
        printf("  \"start\": \"%s\",\n", nodes[start].name);
        printf("  \"end\": \"%s\",\n", nodes[end].name);
        printf("  \"total_cost\": %d,\n", total_cost);
        printf("  \"path\": [");
        for (int i = 0; i < path_len; i++) {
            printf("\"%s\"", nodes[path[i]].name);
            if (i < path_len - 1) printf(", ");
        }
        printf("]\n");
    }
    printf("}\n");
}

void dijkstra(int start, int end) {
    int dist[MAX_NODES];
    int prev[MAX_NODES];
    int visited[MAX_NODES];
    
    for (int i = 0; i < num_nodes; i++) {
        dist[i] = INF;
        prev[i] = -1;
        visited[i] = 0;
    }
    
    dist[start] = 0;
    
    for (int i = 0; i < num_nodes - 1; i++) {
        int min_dist = INF;
        int u = -1;
        
        for (int j = 0; j < num_nodes; j++) {
            if (!visited[j] && dist[j] < min_dist) {
                min_dist = dist[j];
                u = j;
            }
        }
        
        if (u == -1 || u == end) break; // Optimization or no path
        
        visited[u] = 1;
        
        for (int v = 0; v < num_nodes; v++) {
            if (!visited[v] && current_weights[u][v] != INF && dist[u] != INF 
                && dist[u] + current_weights[u][v] < dist[v]) {
                dist[v] = dist[u] + current_weights[u][v];
                prev[v] = u;
            }
        }
    }
    
    if (dist[end] == INF) {
        print_json(NULL, 0, 0, start, end, "No path found");
        return;
    }
    
    // Reconstruct path
    int path[MAX_NODES];
    int path_len = 0;
    int curr = end;
    while (curr != -1) {
        path[path_len++] = curr;
        curr = prev[curr];
    }
    
    // Reverse path
    for (int i = 0; i < path_len / 2; i++) {
        int temp = path[i];
        path[i] = path[path_len - 1 - i];
        path[path_len - 1 - i] = temp;
    }
    
    print_json(path, path_len, dist[end], start, end, NULL);
}

int main(int argc, char *argv[]) {
    if (argc < 3) {
        printf("{\n  \"error\": \"Insufficient arguments. Usage: main <start> <end> [u v penalty ...]\"\n}\n");
        return 1;
    }
    
    load_graph("graph_data.txt");
    
    char *start_name = argv[1];
    char *end_name = argv[2];
    
    int start = get_node_index(start_name);
    int end = get_node_index(end_name);
    
    if (start == -1 || end == -1) {
        printf("{\n  \"error\": \"Invalid start or end node\"\n}\n");
        return 1;
    }
    
    apply_traffic(argc, argv);
    dijkstra(start, end);
    
    return 0;
}
