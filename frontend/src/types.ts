export interface Dag {
    id: number;
    identifier: string;
    name: string;
    title: string;
    version: number;
    latest: boolean;
    components: Component[];
}

export interface Component {
    identifier: string;
    kind: 'Node' | 'Dag';
    name: string;
    title: string;
    action?: string;
    action_type?: string;
    action_detail?: Action;
    fissionable?: boolean;
    fission_config?: any;
    iterable?: boolean;
    iter_config?: any;
    loopable?: boolean;
    loop_config?: any;
    input_adapter?: any;
    output_adapter?: any;
    child_nodes?: string[];
    components?: Component[];
    previous_nodes?: string[];
    previous_dags?: string[];
    fission?: any;
    loop?: any;
}

export interface TaskComponent {
    identifier: string;
    kind: 'Step' | 'Task';
    name: string;
    title: string;
    state: string;
    state_display: string;
    start_time?: string;
    end_time?: string;
    duration?: number;
    input?: any;
    output?: any;
    logs?: any[];
    error?: string;
    previous_steps?: string[];
    previous_tasks?: string[];
    child_steps?: string[];
    components?: TaskComponent[];
}

export interface Task {
    id: number;
    name: string;
    title: string;
    dag?: Dag;
    state: string;
    state_display: string;
    start_time: string;
    end_time: string;
    duration: number;
    steps: Step[];
    components?: TaskComponent[]; // Added for recursive sub-tasks
}

export interface Step {
    id: number;
    identifier: string;
    name: string;
    title: string;
    state: string;
    state_display: string;
    start_time: string;
    end_time: string;
    duration: number;
    node: number;
    input?: any;
    output?: any;
    logs?: any[];
    error?: string;
    previous_steps?: number[];
}

export interface Action {
    id: number;
    name: string;
    title: string;
    type: 'default' | 'carrier' | 'external';
    func: string;
    input_def: any;
    output_def: any;
}
