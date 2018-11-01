import {action, computed, IObservableArray, observable} from "mobx";
import {arrayMove} from "react-sortable-hoc";

function isNullOrWhitespace(s: string | undefined | null): boolean {
    if (s) {
        if (s.length == 0)
            return true;
        return s.match(/^\s+$/) != null;
    }
    else return true;
}

enum PredefinedTypes {
    CheckBox = "CheckBox",
    String = "String",
    Number = "Number",
    Integer = "Integer",
    StringList = "StringList",
    List = "List",
    Radio = "Radio",
    Select = "Select",
    FileBase64 = "FileBase64"
}

export interface RemoteUiPossibleValue {
    id: string|null;
    name: string;
}

export interface RemoteUiFieldDefinition {
    id: string;
    name: string;
    description: string;
    placeholder: string;
    type: string;
    listType?: string;
    possibleValues?: RemoteUiPossibleValue[],
    nullable?: boolean
}

export interface RemoteUiFieldGroupDefinition {
    name: string;
    fields: RemoteUiFieldDefinition[];
}

export interface RemoteUiTypeDefinition {
    groups: RemoteUiFieldGroupDefinition[];
}

export interface RemoteUiDefinition extends RemoteUiTypeDefinition {
    types: { [key: string]: RemoteUiTypeDefinition };
}

interface IRemoteUiData {
    getData(): any | Promise<any>;
    setErrors?(data: any) : void;
    isValid: boolean;
}

function getControlForType(def: RemoteUiDefinition,
                           type: string,
                           listType: string | undefined | null,
                           nullable: boolean | null | undefined,
                           possibleValues: RemoteUiPossibleValue[]|undefined|null,
                           value: any): IRemoteUiData {
    if (type == PredefinedTypes.Number || type == PredefinedTypes.Integer || type == PredefinedTypes.String)
        return new RemoteUiTextInputStore(type, nullable == true, value as string);
    if (type == PredefinedTypes.CheckBox)
        return new RemoteUiCheckboxStore(value == true);
    if(type == PredefinedTypes.FileBase64)
        return new RemoteUiFileBase64Store(nullable == true, value);
    const factory = function(): IRemoteUiData {

        if (type == PredefinedTypes.StringList) {
            type = PredefinedTypes.List;
            listType = PredefinedTypes.String;
        }
        if (type == PredefinedTypes.Radio || type == PredefinedTypes.Select)
            return new RemoteUiSelectStore(type, possibleValues!, nullable == true, value);
        if (type == PredefinedTypes.List)
            return new RemoteUiListStore(def, listType as string, value);
        const typeDef = def.types[type];
        if (typeDef == null)
            throw "Unknown type: " + type;
        return new RemoteUiObjectStore(def, typeDef, value);
    };
    if (nullable == true)
        return new RemoteUiNullableStore(factory, value != null);
    return factory();
}

export class RemoteUiGroupStore {
    @observable name: string;
    @observable fields: RemoteUiFieldStore[];
    @observable isExpanded: boolean = true;

    constructor(name: string, fields: RemoteUiFieldStore[]) {
        this.name = name;
        this.fields = fields;
    }
}

export class RemoteUiObjectStore implements IRemoteUiData {

    @observable groups: RemoteUiGroupStore[];

    constructor(def: RemoteUiDefinition, typeDef: RemoteUiTypeDefinition, value: any) {

        this.groups = typeDef.groups.map(
            g => new RemoteUiGroupStore(g.name, g.fields.map(field =>
                new RemoteUiFieldStore(field,
                    getControlForType(def, field.type, field.listType,
                        field.nullable, field.possibleValues!,
                        value == null ? null : value[field.id])))));
    }

    setErrors(data: any) : void
    {
        for (const g of this.groups)
            for (const f of g.fields) {
                if(data == null)
                    f.setErrors(null);
                else
                    f.setErrors(data[f.id]);
            }
    }
    
    async getData(): Promise<any> {
        const rv = {};
        for (const g of this.groups)
            for (const f of g.fields) {
                rv[f.id] = await f.getData();
            }
        return rv;
    }
    
    @computed get isValid() : boolean{
        for (const g of this.groups)
            for (const f of g.fields) 
                if(!f.isValid)
                    return false;
        return true;
    }
}

export class RemoteUiListStore implements IRemoteUiData {
    @observable elements: IObservableArray<RemoteUiListItem>;
    private def: RemoteUiDefinition;
    private listType: string;

    constructor(def: RemoteUiDefinition, listType: string, value: any[]) {
        this.def = def;
        this.listType = listType;
        if (value == null || !Array.isArray(value)) {
            this.elements = observable.array([]);
            return;
        }
        this.elements = observable.array(value.map(element => new RemoteUiListItem(
            getControlForType(def, listType, null, null, null, element))));
    }

    getData(): any {
        return Promise.all(observable.array(this.elements.map(async e => await e.item.getData())))
    }
    
    @computed get isValid(){
        for(const i of this.elements)
        {
            if(!i.item.isValid)
                return false;
        }
        return true;
    }    

    @action reorder(oldIndex: number, newIndex: number) {
        this.elements = observable.array(arrayMove(this.elements, oldIndex, newIndex));
    }

    @action addItem()
    {
        this.elements.push(
            new RemoteUiListItem(
                getControlForType(this.def, this.listType, null, null, null, null)));
    }

    @action removeItem(item: RemoteUiListItem) {
        this.elements.remove(item);
    }
    
    public setErrors (data: any)
    {
        for(var c = 0; c<this.elements.length; c++)
        {
            if(data == null)
                this.elements[c].setErrors(null);
            else
                this.elements[c].setErrors(data[c]);
        }
    }
}

let nextId = 1;

export class RemoteUiListItem {
    @observable id: number;
    @observable item: IRemoteUiData;
    @observable error?: string;

    public setErrors(data: any)
    {
        this.error = undefined;
        if(this.item.setErrors)
            this.item.setErrors(data);
        else
            this.error = data ? data.toString() : null;
    }
    
    constructor(item: IRemoteUiData) {
        nextId++;
        this.id = nextId;
        this.item = item;
    }
}

export class RemoteUiFieldStore implements IRemoteUiData {
    @observable id: string;
    @observable name: string;
    @observable description: string;
    @observable control: IRemoteUiData;
    @observable isExpanded: boolean;
    @observable error?: string;
    @computed get isValid(){
        return this.control.isValid  
    }

    constructor(definition: RemoteUiFieldDefinition, control: IRemoteUiData) {
        this.id = definition.id;
        this.name = definition.name;
        this.description = definition.description;
        this.control = control;
    }

    public setErrors(data: any) 
    {
        if(this.control.setErrors)
            this.control.setErrors(data);
        else
            this.error = data ? data.toString() : null;
        
    }
    public getData = () => this.control.getData();
}

export class RemoteUiCheckboxStore implements IRemoteUiData {
    constructor(value: boolean) {
        this.value = value;
    }

    @observable value: boolean;

    @action setValue(v: boolean) {
        this.value = v;
    }

    public getData = () => this.value;
    @observable isValid = true;
}

export class RemoteUiTextInputStore implements IRemoteUiData {
    private _type: string;
    private _nullable: boolean;
    @observable value: string | null;

    constructor(type: string, nullable: boolean, value: string) {
        this._type = type;
        this._nullable = nullable;
        this.value = value;
    }

    @action setValue(value?: string) {
        if (value == null || value.length == 0) {
            if (this._nullable)
                this.value = null;
        }
        value = value!;
        if (this._type == PredefinedTypes.Integer) {
            try {
                const parsed = parseInt(value);
                if (isNaN(parsed))
                    this.value = '';
                else
                    this.value = parsed.toString();
            }
            catch {

            }
        }
        else if (this._type == PredefinedTypes.Number) {
            try {
                const parsed = parseFloat(value);
                if (isNaN(parsed))
                    this.value = '';
                else
                    this.value = parsed.toString();
            }
            catch {

            }
        }
        else
            this.value = value;
    }

    public getData(): any {
        if (this.value == null || this.value.length == 0) {
            if (this._nullable)
                return null;
            if (this._type == PredefinedTypes.Integer || this._type == PredefinedTypes.Number)
                return 0;
        }
        return this.value;
    }
    
    @computed get isValid(){
        return this._nullable
            || this._type == PredefinedTypes.Integer
            || this._type == PredefinedTypes.Number
            || !isNullOrWhitespace(this.value);
    }
}


export class RemoteUiSelectStore implements IRemoteUiData {
    @observable possibleValues: RemoteUiPossibleValue[];
    @observable value: string | null;
    @observable nullable: boolean;
    @observable isSelect: boolean;

    constructor(type: string, possibleValues: RemoteUiPossibleValue[], nullable: boolean, value: (string | null)) {
        this.possibleValues = possibleValues;
        this.value = value;
        this.nullable = nullable;
        this.isSelect = type == PredefinedTypes.Select;
    }
    
    @computed get isValid() {
        return this.nullable 
            || !this.isSelect
            || this.value != null 
            || this.possibleValues.some(v=>v.id == null);
    }
    
    public getData = () => this.value || this.possibleValues[0].id;
}

export class RemoteUiFileBase64Store implements IRemoteUiData {
    readonly oldFileString = "<FILE>";
    constructor(nullable: boolean, value: string) {
        this.nullable = nullable;
        this.hadOldFile = value == this.oldFileString;
        this.useOldFile = this.hadOldFile;
    }
    
    @observable hadOldFile : boolean;
    @observable useOldFile : boolean;
    @observable nullable : boolean;
    
    @observable.ref file: File | null;
    @observable isValid = true;
    getData() : Promise<any> | any
    {
        if(this.useOldFile)
            return this.oldFileString;
        if(this.file == null)
            return null;
        var rdr = new FileReader();
        return new Promise((resolve, err)=>{
            rdr.onload = () => resolve((rdr.result as string).replace(/^data:[^;]+;base64,/, ''));
            rdr.onerror = () => err("Unable to read file");
            rdr.readAsDataURL(this.file!); 
        });
    }
    
    @action setNewFile(file: File)
    {
        this.file = file;
        this.useOldFile = false;
    }
    
    @action delete()
    {
        this.file = null;
        if(this.nullable)
        {
            this.useOldFile = false;
        }
        else
        {
            this.useOldFile = this.hadOldFile;
        }
    }
    
    @action useOld()
    {
        if(this.hadOldFile)
            this.useOldFile = true;
    }
}

export class RemoteUiNullableStore implements IRemoteUiData {
    private _factory: () => IRemoteUiData;
    @observable inner?: IRemoteUiData;
    constructor(factory: () => IRemoteUiData, hasValue: boolean)
    {
        this._factory =  factory;
        if (hasValue)
            this.inner = this._factory();
    }
    
    getData(): any {
        if (this.inner)
            return this.inner.getData();
        return null;
    }
    
    @action deleteInner()
    {
        this.inner = undefined;
    }
    
    @action createInner()
    {
        this.inner = this._factory();
    }
    @computed get isValid () {
        return this.inner == null || this.inner.isValid; 
    }
}

export class RemoteUiEditorStore {
    @observable rootObject: RemoteUiObjectStore;

    constructor(def: RemoteUiDefinition, data: any) {
        this.rootObject = new RemoteUiObjectStore(def, def, data);
    }

    @action setErrors(errors: any)
    {
        this.rootObject.setErrors(errors);
    }
    
    public async getDataAsync(): Promise<object> {
        return await this.rootObject.getData();
    }
}