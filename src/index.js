import React from "react";
function getXY(e){
    let x = 0;
    let y = 0;
    if(e.touches && e.touches.length){
        x = e.touches[0].pageX;
        y = e.touches[0].pageY;
    }
    else{
        x = e.pageX;
        y = e.pageY;
    }
    return {x,y}
}
export default class ImageViewer extends React.Component {
    moving = false;
    initX  = 0;
    initY  = 0;
    lastX  = 0;
    lastY  = 0;
    state = {
        x : 0,
        y : 0,
        zoom : 1,
        rotate: 0
    }
    createTransform = (x,y,zoom,rotate) => `translate3d(${x}px,${y}px,0px) scale(${zoom}) rotate(${rotate}deg)`;
    stopSideEffect = (e) => e.stopPropagation();
    preventDefault = (e)=> e.preventDefault();
    startMove = (e) => {
        this.moving = true;
        this.preventDefault(e);
        let xy = getXY(e);
        this.initX  = xy.x - this.lastX;
        this.initY  = xy.y - this.lastY;
    }
    duringMove = (e) => {
        if(!this.moving) return false;
        this.preventDefault(e);
        let xy = getXY(e);
        this.lastX = xy.x - this.initX;
        this.lastY = xy.y - this.initY;
        this.setState({
            x: xy.x - this.initX,
            y: xy.y - this.initY
        });
    }
    endMove = (e) =>{
        this.preventDefault(e);
        this.moving = false;
    }
    applyZoom = (type) => {
        let {zoomStep = 0.3} = this.props;
        switch(type){
            case "in":
                this.setState({zoom: this.state.zoom + zoomStep});
                break;
            case "out":
                this.setState({zoom: this.state.zoom - zoomStep});
                break;
            default:
                console.error("Wrong function invocation");
        }
    }
    applyRotate = (type) => {
        switch(type){
            case "cw":
                this.setState({rotate: this.state.rotate + 90});
                break;
            case "acw":
                this.setState({rotate: this.state.rotate - 90});
                break;
            default:
                console.error("Wrong function invocation");
        }
    }
    reset = () => this.setState({x:0,y:0,zoom:1,rorate:0});
    render(){
        if(!this.props.image) return null;
        return (
            <div className="lb-container">
                <div className="lb-header">
                    <div className="lb-button zoomin" onClick={()=>this.applyZoom("in")}></div>
                    <div className="lb-button zoomout" onClick={()=>this.applyZoom("out")}></div>
                    <div className="lb-button rotatel" onClick={()=>this.applyRotate("acw")}></div>
                    <div className="lb-button rotater" onClick={()=>this.applyRotate("cw")}></div>
                    <div className="lb-button reload" onClick={this.reset}></div>
                    <div className="lb-button close" onClick={e=>this.props.onClose(e)}></div>
                </div>
                <div 
                className="lb-canvas"
                onClick={e=>onClose(e)}>
                    <img draggable = "false"
                    style={{transform: this.createTransform(this.state.x,this.state.y,this.state.zoom,this.state.rotate)}}
                    onMouseDown={e=>this.startMove(e)}
                    onTouchStart={e=>this.startMove(e)}
                    onMouseMove={e=>this.duringMove(e)}
                    onTouchMove={e=>this.duringMove(e)}
                    onMouseUp={e=>this.endMove(e)}
                    onMouseLeave={e=>this.endMove(e)}
                    onTouchEnd={e=>this.endMove(e)}
                    onClick={e=>this.stopSideEffect(e)}
                    className="lb-img"
                    src={this.props.image} alt={this.props.title}/>
                </div>
            </div>
        )
    }
}
