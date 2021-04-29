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
import styles from "./RemoteUiEditor.module.css";
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
        return <div className={styles.remoteUiErrorString}>{props.error}</div>;
    return null;    
});

const ExpandLink = observer(function (props: { item: { isExpanded: boolean}, children: any  }) {
    return <a href="#" style={{textDecoration: 'none'}} onClick={e => {
        e.preventDefault();
        props.item.isExpanded = !props.item.isExpanded;
    }}>{props.item.isExpanded ? '-' : '+'} {props.children}</a>
});

const RemoteUiGroup = observer(function (props: { store: RemoteUiGroupStore }) {
    const items = props.store.fields.map(f => <RemoteUiField item={f} key={f.id}/>);
    if (props.store.name == null || props.store.name.length == 0)
        return <div>{items}</div>;
    return <div>
        <h2><ExpandLink item={props.store}> {props.store.name}</ExpandLink></h2>
        {props.store.isExpanded
            ? <div className={styles.remoteUiGroupItems}>
                {items}
            </div> : null}
    </div>;
});

const RemoteUiObject = observer(function (props: { store: RemoteUiObjectStore }) {
    return <div className={styles.remoteUiObject}>
        {props.store.groups.map(g => <RemoteUiGroup store={g} key={g.name}/>)}
    </div>;
});

const RemoteUiTextInput = observer(function (props: { store: RemoteUiTextInputStore }) {
    return <input className="form-control"
                  value={props.store.value == null ? "" : props.store.value}
                  onChange={e => props.store.setValue(e.currentTarget.value)}/>;
});

const RemoteUiTextArea = observer(function (props: { store: RemoteUiTextAreaStore }) {
    return <textarea className="form-control"
                     value={props.store.value == null ? "" : props.store.value}
                     onChange={e => props.store.setValue(e.currentTarget.value)}></textarea>;
});

const RemoteUiCheckbox = observer(function (props: { store: RemoteUiCheckboxStore }) {
    return <input type="checkbox" checked={props.store.value}
                  onChange={e => props.store.setValue(e.currentTarget.checked)}/>;
});


const RemoteUiSelect = inject("remoteUiEditorContext")(observer(function (props: {
    store: RemoteUiSelectStore, remoteUiEditorContext?: RemoteUiEditorContext })
{
    let selected = props.store.possibleValues.findIndex(v => props.store.value == v.id);
    if (selected == -1)
        selected = 0;
    if (props.store.isSelect && props.remoteUiEditorContext!.remoteUiEditorCustomSelect)
    {
        const CustomSelect = props.remoteUiEditorContext!.remoteUiEditorCustomSelect!;
        return <CustomSelect
            value={props.store.value!}
            values={props.store.possibleValues}
            onChange={v=>props.store.value = v}
        />;
    }
    if (props.store.isSelect)
        return <select className="form-control" value={selected}
                       onChange={e => props.store.value = props.store.possibleValues[parseInt(e.target.value)].id}>
            {props.store.possibleValues.map((value, idx) =>
                <option value={idx} key={idx}>{value.name}</option>)}
        </select>;
    return <div>
        {props.store.possibleValues.map((value, idx) =>
            <div className="radio" key={idx}>
                <label>
                    <input type="radio" value={idx} checked={idx == selected}
                           onChange={e => props.store.value = props.store.possibleValues[parseInt(e.target.value)].id}/>
                    <span>{value.name}</span>
                </label>
            </div>)}

    </div>;
}));


const SortableItem = observer(SortableElement(observer((props: { store: RemoteUiListStore, item: RemoteUiListItem }) : any => {
        return <table className={styles.remoteUiListItem}>
            <tbody>
            <tr>
                <Handle/>
                <td>
                    <Error error={props.item.error}/>
                    <RemoteUiItemEditor store={props.item.item}/>
                </td>
                <td className={styles.remoteUiListItemRemove}><a href="#" className="btn btn-danger" onClick={e => {
                    e.preventDefault();
                    props.store.removeItem(props.item);
                }}>X</a></td>
            </tr>
            </tbody>
        </table>;
    }
)))

const SortableList = observer(SortableContainer(observer((props: { store: RemoteUiListStore }) : any => {
    return <div>
        {props.store.elements.map((item, idx) => <SortableItem index={idx} key={item.id} item={item}
                                                               store={props.store}/>
        )}
    </div>
})));

const Handle = SortableHandle(() => <td className={styles.remoteUiListItemHandle}/>);

const RemoteUiList = observer(function (props: { store: RemoteUiListStore }) {
    return <div>
        <SortableList store={props.store}
                      helperClass={styles.remoteUiListItemHelper}
                      onSortEnd={sort => {
                          props.store.reorder(sort.oldIndex, sort.newIndex);
                      }}
                      useDragHandle={true}/>
        <a href="#" className="btn btn-success" onClick={e => {
            e.preventDefault();
            props.store.addItem();
        }}><b>+</b></a>
    </div>;

});

@observer class RemoteUiFileBase64 extends React.Component<{store: RemoteUiFileBase64Store}>
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
                   style={{opacity: 0, position: 'absolute', top:0, left:0, }}
                   ref={this.inputRef} onChange={e=>{
                i.setNewFile(e.currentTarget.files![0])
            }}/>
            {(i.file || i.useOldFile)
                ?<table className={styles.remoteUiListItem}>
                    <tbody>
                    <tr>
                        <td>
                            {i.useOldFile ? "Existing file" : "Upload " + i.file!.name}
                        </td>
                        <td className={styles.remoteUiListItemRemove}>
                            {i.nullable ?
                                <a href="#" className="btn btn-danger" onClick={e => {
                                    e.preventDefault();
                                    i.delete();
                                }}>X</a> : null}&nbsp;
                            <a href="#" className="btn btn-primary" onClick={e => {
                                e.preventDefault();
                                selectFile();
                            }}>Replace</a>
                        </td>
                    </tr>
                    </tbody>
                </table>
                :<div className={styles.remoteUiNullableAddContainer}
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


const RemoteUiNullable = observer(function (props: {store: RemoteUiNullableStore}) : any {
    const i= props.store;
    if (i.inner)
        return <table className={styles.remoteUiListItem}>
            <tbody>
            <tr>
                <td>
                    <RemoteUiItemEditor store={i.inner}/>
                </td>
                <td className={styles.remoteUiListItemRemove}><a href="#" className="btn btn-danger" onClick={e => {
                    e.preventDefault();
                    i.deleteInner();
                }}>X</a></td>
            </tr>
            </tbody>
        </table>;
    return <div className={styles.remoteUiNullableAddContainer}
                onClick={e => {
                    e.preventDefault();
                    i.createInner();
                }}>
        <a href="#" className="btn btn-success" ><b>+</b></a>
    </div>
});

const RemoteUiField = inject("remoteUiEditorContext")(observer(function (props: {
    item: RemoteUiFieldStore,
    remoteUiEditorContext?: RemoteUiEditorContext }): any
{
    const Description = () => {
        return isNullOrWhitespace(props.item.description) ? null
            : <div className={styles.remoteUiDescription}>{props.item.description}</div>;
    };
    const error = props.item.error || (props.remoteUiEditorContext!.highlightErrors && !props.item.isValid);
    const labelClass = error ? "remote-ui-error" : "";

    if (props.item.control instanceof RemoteUiCheckboxStore)
        return <div>
            <Error error={props.item.error}/>
            <label className={"form-check-label " + labelClass}><RemoteUiCheckbox store={props.item.control}/> {props.item.name}
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
                    <RemoteUiItemEditor store={props.item.control}/>
                </>
                : null}
        </div>;
    return <div>
        {isNullOrWhitespace(props.item.name) ? null :  <label className={labelClass}>{props.item.name}</label>}
        <Description/>
        <Error error={props.item.error}/>
        <RemoteUiItemEditor store={props.item.control}/>
    </div>;
}));

const RemoteUiOrderedMultiSelectSortableItem = observer(SortableElement(observer((props: {
    item: RemoteUiPossibleValue, store: RemoteUiOrderedMultiSelectStore
}) : any => {
    const store = props.store;
    const item = props.item;
    return <table className={styles.remoteUiListItem}>
        <tbody>
        <tr>
            <Handle />
            <td>
                <input className="form-control"
                       style={{ marginTop: 0 }}
                       readOnly={true}
                       value={item.name}/>
            </td>
            <td className={styles.remoteUiListItemRemove}>
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

const RemoteUiOrderedMultiSelectIncludes = observer(SortableContainer(observer((props: {
    store: RemoteUiOrderedMultiSelectStore
}) => {
    const store = props.store;
    return <div>{props.store.included.map((item, index) => {
        return <RemoteUiOrderedMultiSelectSortableItem item={item} index={index} key={item.id!} store={store} />
    })}</div>
})));

const RemoteUiOrderedMultiSelectExcludes = observer((props: { store: RemoteUiOrderedMultiSelectStore }) => {
    const store = props.store;
    return <div>{props.store.excluded.map(item => {
        return <table className={styles.remoteUiListItem} key={item.id!}>
            <tbody>
            <tr>
                <td>
                    <input className="form-control"
                           style={{ marginTop: 0 }}
                           readOnly={true}
                           value={item.name}/>
                </td>
                <td className={styles.remoteUiListItemRemove}>
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

export const RemoteUiOrderedMultiSelect = observer((props: { store: RemoteUiOrderedMultiSelectStore }) => {
    const store = props.store;
    return <div className={styles.remoteUiObject} style={{ marginTop: 5 }}>
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
                        : <RemoteUiOrderedMultiSelectExcludes store={store} />}
                </td>
            </tr>
            </tbody>
        </table>
    </div>;
});

export const RemoteUiItemEditor = inject("remoteUiEditorContext")(observer(function (props: {
    store: any, remoteUiEditorContext?: RemoteUiEditorContext }) {
    if(props.remoteUiEditorContext && props.remoteUiEditorContext.customization)
    {
        const resolved = props.remoteUiEditorContext.customization.getEditorFor(props.store);
        if(resolved)
            return resolved;
    }
    if (props.store instanceof RemoteUiObjectStore)
        return <RemoteUiObject store={props.store}/>;
    else if (props.store instanceof RemoteUiTextInputStore)
        return <RemoteUiTextInput store={props.store}/>;
    else if (props.store instanceof RemoteUiTextAreaStore)
        return <RemoteUiTextArea store={props.store}/>;
    else if (props.store instanceof RemoteUiCheckboxStore)
        return <RemoteUiCheckbox store={props.store}/>;
    else if (props.store instanceof RemoteUiSelectStore) {
        return <RemoteUiSelect store={props.store}/>;
    }
    else if (props.store instanceof RemoteUiListStore)
        return <RemoteUiList store={props.store}/>;
    else if (props.store instanceof RemoteUiOrderedMultiSelectStore)
        return <RemoteUiOrderedMultiSelect store={props.store}/>;
    else if(props.store instanceof RemoteUiFileBase64Store)
        return <RemoteUiFileBase64 store={props.store}/>;
    else if (props.store instanceof RemoteUiNullableStore)
        return <RemoteUiNullable store={props.store}/>;
    else
        return <div>Unknown field type</div>;
}));


export interface RemoteUiEditorCustomSelectProps
{
    values: RemoteUiPossibleValue[];
    value: string;
    onChange: (v: string) => void;
}
interface CustomSelect {
    (props: RemoteUiEditorCustomSelectProps): any;
}

class RemoteUiEditorContext
{
    @observable.ref remoteUiEditorCustomSelect?: CustomSelect;
    @observable highlightErrors: boolean;
    @observable.ref customization?: IRemoteUiEditorCustomization;
}

export interface IRemoteUiEditorCustomization
{
    getEditorFor(store: IRemoteUiData) : any;
}

export class RemoteUiEditor extends React.Component<{ store: RemoteUiEditorStore,
    customSelect?: CustomSelect,
    highlightErrors?: boolean,
    customization?: IRemoteUiEditorCustomization},
    {
        context: RemoteUiEditorContext
    }
    > {
    constructor(props: any)
    {
        super(props);
        this.state ={context: new RemoteUiEditorContext()};
        this.componentDidUpdate();
    }

    componentDidUpdate()
    {
        this.state.context.highlightErrors = this.props.highlightErrors == true;
        this.state.context.remoteUiEditorCustomSelect = this.props.customSelect;
        this.state.context.customization = this.props.customization;
    }

    render() {
        if (this.props.store == null)
            return null;
        return <div className={styles.remoteUiEditor}>
            <Provider remoteUiEditorContext={this.state.context}>
                <RemoteUiItemEditor store={this.props.store.rootObject}/>
            </Provider>
        </div>
    }
}