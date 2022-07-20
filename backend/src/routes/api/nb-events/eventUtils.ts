import { V1EventList } from "@kubernetes/client-node";
import { KubeFastifyInstance, NotebookStatus } from "../../../types";

export const getNotebookEvents = async (fastify: KubeFastifyInstance, nbName: string) => {
    const response = await fastify.kube.coreV1Api.listNamespacedEvent(
        fastify.kube.namespace,
        undefined,
        undefined,
        undefined,
        `involvedObject.kind=Notebook,involvedObject.name=${nbName}`,
        undefined,
        undefined,
        undefined,
        undefined,
        false,
    )
    .then ((res) => {
        return res.body as V1EventList;
    })
    .catch((e) => {
        fastify.log.error(e)
        return {items: []} as V1EventList;
    });
    let percentile = 0;
    let status:("In Progress" | "Warning" | "Error" | "Success") = "In Progress"
    const lastItem = response.items[response.items.length-1]
    if (lastItem.message.includes('oauth-proxy')) {
        switch(lastItem.reason) {
            case "Pulling": {
                percentile = 72;
                break;
            }
            case "Pulled": {
                percentile = 81;
                break;
            }
            case "Created": {
                percentile = 90;
                break;
            }
            case "Started": {
                percentile = 100;
                break;
            }
        }
    }
    else {
        switch(lastItem.reason) {
            case "SuccessfulCreate": {
                percentile = 9;
                break;
            }
            case "Scheduled": {
                percentile = 18;
                break;
            }
            case "AddedInterface": {
                percentile = 27;
                break;
            }
            case "Pulling": {
                percentile = 36;
                break;
            }
            case "Pulled": {
                percentile = 45;
                break;
            }
            case "Created": {
                percentile = 54;
                break;
            }
            case "Started": {
                percentile = 63;
                break;
            }
        }
    }
    
    const statusObject:NotebookStatus = {
        percentile: percentile,
        currentStatus: status,
        currentEvent: lastItem.reason,
        currentEventDescription: lastItem.message,
        events: response.items
    };
    return statusObject
}