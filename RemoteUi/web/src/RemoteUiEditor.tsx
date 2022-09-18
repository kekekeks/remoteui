import {
    IRemoteUiData,
    RemoteUiCheckboxStore,
    RemoteUiOrderedMultiSelectStore,
    RemoteUiEditorStore,
    RemoteUiFieldStore, RemoteUiFileBase64Store,
    RemoteUiGroupStore,
    RemoteUiListItem,
    RemoteUiListStore,
    RemoteUiNullableStore,
    RemoteUiObjectStore, RemoteUiPossibleValue,
    RemoteUiSelectStore, RemoteUiTextAreaStore,
    RemoteUiTextInputStore
} from "./RemoteUiEditorStore";
import * as React from "react";
import {inject, observer, Provider} from "mobx-react";
import {SortableContainer, SortableElement, SortableHandle} from "react-sortable-hoc";
import "./styles/RemoteUiEditor.css";
import {observable} from "mobx";


function isNullOrWhitespace(s: string | undefined | null): boolean {
    if (s) {
        if (s.length == 0)
            return true;
        return s.match(/^\s+$/) != null;
    }
    else return true;
}

const Error = observer(function(props: {error: string|undefined|null})
{
    if(props.error)
        return <div className="remote-ui-error-string">{props.error}</div>;
    return null;    
});

const ExpandLink = observer(function (props: { item: { isExpanded: boolean}, children: any  }) {
    return <a href="#" style={{textDecoration: 'none'}} onClick={e => {
        e.preventDefault();
        props.item.isExpanded = !props.item.isExpanded;
    }}>{props.item.isExpanded ? '-' : '+'} {props.children}</a>
});

type RemoteUiGroupProps = {
    store: RemoteUiGroupStore,
    disabled?: boolean,
}

const RemoteUiGroup = observer(function (props: RemoteUiGroupProps) {
    const items = props.store.fields.map(f => <RemoteUiField disabled={props.disabled} item={f} key={f.id}/>);
    if (props.store.name == null || props.store.name.length == 0)
        return <div>{items}</div>;
    return <div>
        <h2><ExpandLink item={props.store}> {props.store.name}</ExpandLink></h2>
        {props.store.isExpanded
            ? <div className="remote-ui-group-items">
                {items}
            </div> : null}
    </div>;
});

type RemoteUiObjectProps = {
    store: RemoteUiObjectStore,
    disabled?: boolean,
}

const RemoteUiObject = observer(function (props: RemoteUiObjectProps) {
    return <div className="remote-ui-object">
        {props.store.groups.map(g => <RemoteUiGroup store={g} key={g.name} disabled={props.disabled} />)}
    </div>;
});

type RemoteUiTextInputProps = {
    store: RemoteUiTextInputStore,
    disabled?: boolean,
}

const RemoteUiTextInput = observer(function (props: RemoteUiTextInputProps) {
    return <input className="form-control"
                  disabled={props.disabled}
                  value={props.store.value == null ? "" : props.store.value}
                  onChange={e => props.store.setValue(e.currentTarget.value)}/>;
});

type RemoteUiTextAreaProps = {
    store: RemoteUiTextAreaStore,
    disabled?: boolean,
}

const RemoteUiTextArea = observer(function (props: RemoteUiTextAreaProps) {
    return <textarea className="form-control"
                     disabled={props.disabled}
                     value={props.store.value == null ? "" : props.store.value}
                     onChange={e => props.store.setValue(e.currentTarget.value)}></textarea>;
});

type RemoteUiCheckboxProps = {
    store: RemoteUiCheckboxStore,
    disabled?: boolean,
}

const RemoteUiCheckbox = observer(function (props: RemoteUiCheckboxProps) {
    return <input type="checkbox" checked={props.store.value}
                  disabled={props.disabled}
                  onChange={e => props.store.setValue(e.currentTarget.checked)}/>;
});

type RemoteUiSelectProps = {
    store: RemoteUiSelectStore,
    disabled?: boolean,
    remoteUiEditorContext?: RemoteUiEditorContext
}

const RemoteUiSelect = inject("remoteUiEditorContext")(observer(function (props: RemoteUiSelectProps) {
    let selected = props.store.possibleValues.findIndex(v => props.store.value == v.id);
    if (selected == -1)
        selected = 0;
    if (props.store.isSelect && props.remoteUiEditorContext!.remoteUiEditorCustomSelect)
    {
        const CustomSelect = props.remoteUiEditorContext!.remoteUiEditorCustomSelect!;
        return <CustomSelect 
            disabled={props.disabled}
            value={props.store.value!}
            values={props.store.possibleValues}
            onChange={v=>props.store.value = v}
        />;
    }
    if (props.store.isSelect)
        return <select className="form-control" value={selected}
                       disabled={props.disabled}
                       onChange={e => props.store.value = props.store.possibleValues[parseInt(e.target.value)].id}>
            {props.store.possibleValues.map((value, idx) =>
                <option value={idx} key={idx}>{value.name}</option>)}
        </select>;
    return <div>
        {props.store.possibleValues.map((value, idx) =>
            <div className="radio" key={idx}>
                <label>
                    <input type="radio" value={idx} checked={idx == selected}
                           disabled={props.disabled}
                           onChange={e => props.store.value = props.store.possibleValues[parseInt(e.target.value)].id}/>
                    <span>{value.name}</span>
                </label>
            </div>)}

    </div>;
}));

type SortableItemProps = {
    store: RemoteUiListStore,
    item: RemoteUiListItem,
    effectivelyDisabled?: boolean,
}

const SortableItem = observer(SortableElement(observer((props: SortableItemProps) : any => {
        return <table className="remote-ui-list-item">
            <tbody>
            <tr>
                <Handle/>
                <td>
                    <Error error={props.item.error}/>
                    <RemoteUiItemEditor disabled={props.effectivelyDisabled} store={props.item.item}/>
                </td>
                <td className="remote-ui-list-item-remove"><a href="#" className="btn btn-danger" onClick={e => {
                    e.preventDefault();
                    if (props.effectivelyDisabled) return;
                    props.store.removeItem(props.item);
                }}>X</a></td>
            </tr>
            </tbody>
        </table>;
    }
)))

type SortableListProps = {
    store: RemoteUiListStore,
    disabled?: boolean,
}

const SortableList = observer(SortableContainer(observer((props: SortableListProps) : any => {
    return <div>
        {props.store.elements.map((item, idx) => <SortableItem index={idx} key={item.id} item={item}
                                                               effectivelyDisabled={props.disabled}
                                                               disabled={props.disabled}
                                                               store={props.store}/>
        )}
    </div>
})));

const Handle = SortableHandle(() => <td className="remote-ui-list-item-handle"/>);

type RemoteUiListProps = {
    store: RemoteUiListStore,
    disabled?: boolean,
}

const RemoteUiList = observer(function (props: RemoteUiListProps) {
    return <div>
        <SortableList store={props.store}
                      disabled={props.disabled}
                      onSortEnd={sort => {
                          if (props.disabled) return;
                          props.store.reorder(sort.oldIndex, sort.newIndex);
                      }}
                      useDragHandle={true}/>
        <a href="#" className="btn btn-success" onClick={e => {
            e.preventDefault();
            if (props.disabled) return;
            props.store.addItem();
        }}><b>+</b></a>
    </div>;

});

type RemoteUiFileBase64Props = {
    store: RemoteUiFileBase64Store,
    disabled?: boolean,
}

@observer class RemoteUiFileBase64 extends React.Component<RemoteUiFileBase64Props>
{
    private inputRef: React.RefObject<HTMLInputElement>;
    constructor(props :any)
    {
        super(props);
        this.inputRef = React.createRef<HTMLInputElement>();
    }
    
    render()
    {
        const i= this.props.store;
        const selectFile = () => {
            if(this.inputRef.current)
                this.inputRef.current.click();
        };
          
        return <div>
            <input name="RemoteUi" type="file"
                   disabled={this.props.disabled}
                   style={{opacity: 0, position: 'absolute', top:0, left:0, }}
                   ref={this.inputRef} onChange={e=>{
                i.setNewFile(e.currentTarget.files![0])
            }}/>
            {(i.file || i.useOldFile)
                ?<table className="remote-ui-list-item">
                    <tbody>
                    <tr>
                        <td>
                            {i.useOldFile ? "Existing file" : "Upload " + i.file!.name}
                        </td>
                        <td className="remote-ui-list-item-remove">
                            {i.nullable ?
                                <a href="#" className="btn btn-danger" onClick={e => {
                                    e.preventDefault();
                                    if (this.props.disabled) return;
                                    i.delete();
                                }}>X</a> : null}&nbsp;
                            <a href="#" className="btn btn-primary" onClick={e => {
                                e.preventDefault();
                                if (this.props.disabled) return;
                                selectFile();
                            }}>Replace</a>
                        </td>
                    </tr>
                    </tbody>
                </table>
                :<div className="remote-ui-nullable-add-container"
                      onClick={e => {
                          e.preventDefault();
                          selectFile();
                      }}>
                    <a href="#" className="btn btn-success"><b>+</b></a>&nbsp;
                    {i.hadOldFile ? <a href="#" className="btn btn-danger" onClick={e=>{
                        e.preventDefault();
                        e.stopPropagation();
                        i.useOld();
                    }}><b>Use old</b></a> : null}

                </div>}
        </div>;
    }
}

type RemoteUiNullableProps = {
    store: RemoteUiNullableStore,
    disabled?: boolean,
}

const RemoteUiNullable = observer(function (props: RemoteUiNullableProps) : any {
    const i= props.store;
    if (i.inner)
        return <table className="remote-ui-list-item">
            <tbody>
            <tr>
                <td>
                    <RemoteUiItemEditor disabled={props.disabled} store={i.inner}/>
                </td>
                <td className="remote-ui-list-item-remove"><a href="#" className="btn btn-danger" onClick={e => {
                    e.preventDefault();
                    if (props.disabled) return;
                    i.deleteInner();
                }}>X</a></td>
            </tr>
            </tbody>
        </table>;
    return <div className="remote-ui-nullable-add-container"
                onClick={e => {
                    e.preventDefault();
                    if (props.disabled) return;
                    i.createInner();
                }}>
        <a href="#" className="btn btn-success" ><b>+</b></a>
    </div>
});

type RemoteUiFieldProps = {
    item: RemoteUiFieldStore,
    remoteUiEditorContext?: RemoteUiEditorContext,
    disabled?: boolean,
}

const RemoteUiField = inject("remoteUiEditorContext")(observer(function (props: RemoteUiFieldProps): any {
    const Description = () => {
        return isNullOrWhitespace(props.item.description) ? null
            : <div className="remote-ui-description">{props.item.description}</div>;
    };
    const error = props.item.error || (props.remoteUiEditorContext!.highlightErrors && !props.item.isValid);
    const labelClass = error ? "remote-ui-error" : "";
    const disabled = props.disabled || props.item.readOnly;

    if (props.item.control instanceof RemoteUiCheckboxStore)
        return <div>
            <Error error={props.item.error}/>
            <label className={"form-check-label " + labelClass}>
                <RemoteUiCheckbox store={props.item.control} disabled={disabled} /> {props.item.name}
            </label>
            <Description/>
        </div>;
    if (props.item.control instanceof RemoteUiObjectStore)
        return <div>
            { props.item.alwaysExpanded 
                ? <label className={labelClass}>{props.item.name}</label> 
                : <label className={labelClass}><ExpandLink item={props.item}> {props.item.name}</ExpandLink></label> }
            <Error error={props.item.error}/>
            {props.item.isExpanded
                ? <>
                    <Description/>
                    <RemoteUiItemEditor store={props.item.control} disabled={disabled}/>
                </>
                : null}
        </div>;
    return <div>
        {isNullOrWhitespace(props.item.name) ? null :  <label className={labelClass}>{props.item.name}</label>}
        <Description/>
        <Error error={props.item.error}/>
        <RemoteUiItemEditor store={props.item.control} disabled={disabled}/>
    </div>;
}));

type RemoteUiOrderedMultiSelectSortableItemProps = {
    item: RemoteUiPossibleValue,
    store: RemoteUiOrderedMultiSelectStore,
    disabled?: boolean,
}

const RemoteUiOrderedMultiSelectSortableItem = observer(SortableElement(observer((props: RemoteUiOrderedMultiSelectSortableItemProps) : any => {
    const store = props.store;
    const item = props.item;
    return <table className="remote-ui-list-item">
        <tbody>
        <tr>
            <Handle />
            <td>
                <input className="form-control"
                       disabled={props.disabled}
                       style={{ marginTop: 0 }}
                       readOnly={true}
                       value={item.name}/>
            </td>
            <td className="remote-ui-list-item-remove">
                <a href="#"
                   className="btn btn-warning"
                   onClick={e => store.arrangeItem(item, e)}>
                    {'-'}
                </a>
            </td>
        </tr>
        </tbody>
    </table>
})));

type RemoteUiOrderedMultiSelectIncludesProps = {
    store: RemoteUiOrderedMultiSelectStore,
    disabled?: boolean,
}

const RemoteUiOrderedMultiSelectIncludes = observer(SortableContainer(observer((props: RemoteUiOrderedMultiSelectIncludesProps) => {
    const store = props.store;
    return <div>{props.store.included.map((item, index) => {
        return <RemoteUiOrderedMultiSelectSortableItem disabled={props.disabled} item={item} index={index} key={item.id!} store={store} />
    })}</div>
})));

type RemoteUiOrderedMultiSelectExcludesProps = {
    store: RemoteUiOrderedMultiSelectStore,
    disabled?: boolean,
}

const RemoteUiOrderedMultiSelectExcludes = observer((props: RemoteUiOrderedMultiSelectExcludesProps) => {
    const store = props.store;
    return <div>{props.store.excluded.map(item => {
        return <table className="remote-ui-list-item" key={item.id!}>
            <tbody>
            <tr>
                <td>
                    <input className="form-control"
                           disabled={props.disabled}
                           style={{ marginTop: 0 }}
                           readOnly={true}
                           value={item.name}/>
                </td>
                <td className="remote-ui-list-item-remove">
                    <a href="#"
                       className="btn btn-success"
                       onClick={e => store.arrangeItem(item, e)}>
                        {'+'}
                    </a>
                </td>
            </tr>
            </tbody>
        </table>
    })}</div>
});

type RemoteUiOrderedMultiSelectProps = {
    store: RemoteUiOrderedMultiSelectStore,
    disabled?: boolean,
}

export const RemoteUiOrderedMultiSelect = observer((props: RemoteUiOrderedMultiSelectProps) => {
    const store = props.store;
    return <div className="remote-ui-object" style={{ marginTop: 5 }}>
        <table style={{ width: '100%' }}>
            <tbody>
            <tr>
                <td style={{ verticalAlign: 'top', width: '50%' }}>
                    {store.included.length === 0
                        ? <div className="text-muted text-center" 
                               style={{ marginTop: 10 }}>
                            Nothing selected.
                          </div>
                        : <RemoteUiOrderedMultiSelectIncludes
                            disabled={props.disabled}
                            store={store}
                            useDragHandle={true}
                            onSortEnd={sort => store.reorder(sort.oldIndex, sort.newIndex)} />}
                </td>
                <td style={{ verticalAlign: 'top', width: '50%' }}>
                    {store.excluded.length === 0
                        ? <div className="text-muted text-center" 
                               style={{ marginTop: 10 }}>
                            All elements were selected.
                          </div>
                        : <RemoteUiOrderedMultiSelectExcludes
                            disabled={props.disabled}
                            store={store} />}
                </td>
            </tr>
            </tbody>
        </table>
    </div>;
});

type RemoteUiItemEditorProps = {
    store: any,
    remoteUiEditorContext?: RemoteUiEditorContext,
    disabled?: boolean,
}

export const RemoteUiItemEditor = inject("remoteUiEditorContext")(observer(function (props: RemoteUiItemEditorProps) {
    if (props.remoteUiEditorContext && props.remoteUiEditorContext.customization)
    {
        const resolved = props.remoteUiEditorContext.customization.getEditorFor(props.store);
        if (resolved)
            return resolved;
    }
    if (props.store instanceof RemoteUiObjectStore)
        return <RemoteUiObject disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiTextInputStore)
        return <RemoteUiTextInput disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiTextAreaStore)
        return <RemoteUiTextArea disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiCheckboxStore)
        return <RemoteUiCheckbox disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiSelectStore)
        return <RemoteUiSelect disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiListStore)
        return <RemoteUiList disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiOrderedMultiSelectStore)
        return <RemoteUiOrderedMultiSelect disabled={props.disabled} store={props.store}/>;
    else if(props.store instanceof RemoteUiFileBase64Store)
        return <RemoteUiFileBase64 disabled={props.disabled} store={props.store}/>;
    else if (props.store instanceof RemoteUiNullableStore)
        return <RemoteUiNullable disabled={props.disabled} store={props.store}/>;
    else
        return <div>Unknown field type</div>;
}));


export interface RemoteUiEditorCustomSelectProps
{
    values: RemoteUiPossibleValue[];
    value: string;
    onChange: (v: string) => void; 
    disabled?: boolean,
}
interface CustomSelect {
    (props: RemoteUiEditorCustomSelectProps): any;
}

class RemoteUiEditorContext
{
    @observable.ref remoteUiEditorCustomSelect?: CustomSelect;
    @observable highlightErrors: boolean = false;
    @observable.ref customization?: IRemoteUiEditorCustomization;
}

export interface IRemoteUiEditorCustomization
{
    getEditorFor(store: IRemoteUiData) : any;
}

type RemoteUiEditorProps = {
    store: RemoteUiEditorStore,
    customSelect?: CustomSelect,
    highlightErrors?: boolean,
    disabled?: boolean,
    customization?: IRemoteUiEditorCustomization,
}

export class RemoteUiEditor extends React.Component<RemoteUiEditorProps, { context: RemoteUiEditorContext }> {
    constructor(props: any) {
        super(props);
        this.state = {context: new RemoteUiEditorContext()};
        this.componentDidUpdate();
    }
    
    componentDidUpdate() {
        this.state.context.highlightErrors = this.props.highlightErrors == true;
        this.state.context.remoteUiEditorCustomSelect = this.props.customSelect;
        this.state.context.customization = this.props.customization;
    }
    
    render() {
        if (this.props.store == null)
            return null;
        return <div className="remote-ui-editor">
            <Provider remoteUiEditorContext={this.state.context}>
                <RemoteUiItemEditor disabled={this.props.disabled} store={this.props.store.rootObject}/>
            </Provider>
        </div>
    }
}
