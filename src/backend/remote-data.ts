export interface Components {
    components: Component[];
}

export interface Component {
    name: string;
    description: string;
    params: Param[];
}

export interface Param {
    default_value: number | string | Object;
    type: Type;
    name: string;
}

export interface Object {
    [name: string]: Object | string | number | string[];
}

interface TypeAny    { id: "any"; }
interface TypeString { id: "string"; }
interface TypeNumber { id: "number"; }
interface TypeEnum   { id: "enum"; variants: string[]; }
interface TypeComp   { id: "component"; name: string; args: Param[]; }
interface TypeObject { id: "object"; props: { [prop_name: string]: Type }; }
export type Type = TypeString | TypeNumber | TypeEnum | TypeObject | TypeAny | TypeComp;
